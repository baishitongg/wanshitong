import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/orders — fetch orders (staff only)
export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== "STAFF") return NextResponse.json({ error: "无权限" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const orders = await prisma.order.findMany({
        where: status ? { status: status as any } : undefined,
        include: {
            items: { include: { product: true } },
            user: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
}

// POST /api/orders — convert cart to order, clear cart, notify staff via socket
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const userId = (session.user as any).id as string;
    const { customerName, customerPhone, notes, addressId } = await req.json();

    // Validate address
    if (!addressId) {
        return NextResponse.json({ error: "请选择收货地址" }, { status: 400 });
    }

    const address = await prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.userId !== userId) {
        return NextResponse.json({ error: "地址不存在" }, { status: 400 });
    }

    // Fetch user's cart with items
    const cart = await prisma.cart.findUnique({
        where: { userId },
        include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
        return NextResponse.json({ error: "购物车为空" }, { status: 400 });
    }

    // Validate stock for all items
    for (const item of cart.items) {
        if (item.product.stock < item.quantity) {
            return NextResponse.json(
                { error: `商品「${item.product.name}」库存不足` },
                { status: 400 }
            );
        }
    }

    // Calculate total
    const totalAmount = cart.items.reduce(
        (sum: number, item: any) => sum + Number(item.product.price) * item.quantity,
        0
    );

    // Create order + items, deduct stock, clear cart — all in one transaction
    const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
            data: {
                userId,
                customerName: customerName ?? (session.user as any).name,
                customerPhone: customerPhone ?? (session.user as any).phone,
                notes,
                totalAmount,
                // Link address
                addressId: address.id,
                // Snapshot address fields for historical record
                deliveryRecipient: address.recipient,
                deliveryPhone: address.phone,
                deliveryStreet: address.street,
                deliveryCity: address.city,
                deliveryState: address.state,
                deliveryPostcode: address.postcode,
                deliveryCountry: address.country,
                items: {
                    create: cart.items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.product.price,
                    })),
                },
            },
            include: {
                items: { include: { product: true } },
                user: { select: { id: true, name: true, phone: true } },
            },
        });

        // Deduct stock
        for (const item of cart.items) {
            await tx.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
            });
        }

        // Clear cart
        await tx.cart.delete({ where: { id: cart.id } });

        return newOrder;
    });

    // Emit to staff via global Socket.IO instance
    try {
        (global as any).io?.to("assistants").emit("new_order", order);
    } catch (e) {
        console.error("[orders] socket emit failed:", e);
    }

    return NextResponse.json(order, { status: 201 });
}