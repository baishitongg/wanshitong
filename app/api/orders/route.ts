import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

type ContactChannel = "PHONE" | "TELEGRAM";

type SessionUser = {
    id?: string;
    role?: string;
    name?: string | null;
    phone?: string | null;
    telegramUsername?: string | null;
    preferredContactChannel?: ContactChannel | null;
};

type CreateOrderBody = {
    customerName?: string;
    customerPhone?: string;
    telegramUsername?: string | null;
    preferredContactChannel?: ContactChannel;
    notes?: string;
    addressId?: string;
};

// GET /api/orders — fetch orders (staff only)
export async function GET(req: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const role = user.role;

    if (role !== "STAFF") {
        return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");

    const validStatuses: OrderStatus[] = [
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "DONE",
        "CANCELLED",
    ];

    const status =
        statusParam && validStatuses.includes(statusParam as OrderStatus)
            ? (statusParam as OrderStatus)
            : undefined;

    const orders = await prisma.order.findMany({
        where: status ? { status } : undefined,
        include: {
            items: { include: { product: true } },
            user: {
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    telegramUsername: true,
                    preferredContactChannel: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
}

// POST /api/orders — convert cart to order, clear cart, notify staff via socket
export async function POST(req: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const userId = user.id;

    if (!userId) {
        return NextResponse.json({ error: "用户信息无效" }, { status: 401 });
    }

    const {
        customerName,
        customerPhone,
        telegramUsername,
        preferredContactChannel,
        notes,
        addressId,
    } = (await req.json()) as CreateOrderBody;

    if (!addressId) {
        return NextResponse.json({ error: "请选择收货地址" }, { status: 400 });
    }

    const resolvedPreferredChannel: ContactChannel =
        preferredContactChannel ??
        user.preferredContactChannel ??
        "PHONE";

    const resolvedPhone = (customerPhone ?? user.phone ?? "").trim();
    const resolvedTelegram = (telegramUsername ?? user.telegramUsername ?? "")
        .trim()
        .replace(/^@+/, "");

    if (resolvedPreferredChannel === "PHONE" && !resolvedPhone) {
        return NextResponse.json(
            { error: "您选择了手机号码作为联系方式，但手机号为空" },
            { status: 400 },
        );
    }

    if (resolvedPreferredChannel === "TELEGRAM" && !resolvedTelegram) {
        return NextResponse.json(
            { error: "您选择了 Telegram 作为联系方式，但 Telegram 用户名为空" },
            { status: 400 },
        );
    }

    const address = await prisma.address.findUnique({
        where: { id: addressId },
    });

    if (!address || address.userId !== userId) {
        return NextResponse.json({ error: "地址不存在" }, { status: 400 });
    }

    const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
            items: {
                include: { product: true },
            },
        },
    });

    if (!cart || cart.items.length === 0) {
        return NextResponse.json({ error: "购物车为空" }, { status: 400 });
    }

    try {
        const order = await prisma.$transaction(async (tx) => {
            for (const item of cart.items) {
                const updated = await tx.product.updateMany({
                    where: {
                        id: item.productId,
                        stock: {
                            gte: item.quantity,
                        },
                    },
                    data: {
                        stock: {
                            decrement: item.quantity,
                        },
                    },
                });

                if (updated.count === 0) {
                    const latestProduct = await tx.product.findUnique({
                        where: { id: item.productId },
                        select: { name: true, stock: true },
                    });

                    throw new Error(
                        `商品「${latestProduct?.name ?? item.product.name}」库存不足，当前仅剩 ${latestProduct?.stock ?? 0} 件`,
                    );
                }
            }

            const totalAmount = cart.items.reduce(
                (sum, item) => sum + Number(item.product.price) * item.quantity,
                0,
            );

            const newOrder = await tx.order.create({
                data: {
                    userId,
                    customerName: customerName ?? user.name ?? null,
                    customerPhone: resolvedPhone || null,
                    telegramUsername: resolvedTelegram || null,
                    preferredContactChannel: resolvedPreferredChannel,
                    notes,
                    totalAmount,
                    addressId: address.id,
                    deliveryRecipient: address.recipient,
                    deliveryPhone: address.phone,
                    deliveryStreet: address.street,
                    deliveryCity: address.city,
                    deliveryState: address.state,
                    deliveryPostcode: address.postcode,
                    deliveryCountry: address.country,
                    items: {
                        create: cart.items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.product.price,
                        })),
                    },
                },
                include: {
                    items: { include: { product: true } },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            telegramUsername: true,
                            preferredContactChannel: true,
                        },
                    },
                },
            });

            await tx.cartItem.deleteMany({
                where: { cartId: cart.id },
            });

            await tx.cart.delete({
                where: { id: cart.id },
            });

            return newOrder;
        });

        try {
            const io = (globalThis as {
                io?: {
                    to: (room: string) => {
                        emit: (event: string, payload: unknown) => void;
                    };
                };
            }).io;

            io?.to("assistants").emit("new_order", order);
        } catch (error) {
            console.error("[orders] socket emit failed:", error);
        }

        return NextResponse.json(order, { status: 201 });
    } catch (error) {
        console.error("[orders] create order failed:", error);

        const message =
            error instanceof Error ? error.message : "下单失败，请稍后重试";

        return NextResponse.json({ error: message }, { status: 400 });
    }
}