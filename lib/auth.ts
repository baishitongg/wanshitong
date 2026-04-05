import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DEFAULT_SHOP_SLUG } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type AuthUser = {
    id: string;
    name: string | null;
    role: string;
    phone: string;
    profileCompleted: boolean;
    telegramUsername: string | null;
    preferredContactChannel: "PHONE" | "TELEGRAM";
    staffShopId: string | null;
    staffShopSlug: string | null;
};

type SessionUserFields = {
    id: string;
    role: string;
    phone: string;
    profileCompleted: boolean;
    telegramUsername: string | null;
    preferredContactChannel: "PHONE" | "TELEGRAM";
    staffShopId: string | null;
    staffShopSlug: string | null;
};

type TokenFields = {
    id: string;
    role: string;
    phone: string;
    profileCompleted: boolean;
    telegramUsername: string | null;
    preferredContactChannel: "PHONE" | "TELEGRAM";
    staffShopId: string | null;
    staffShopSlug: string | null;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    trustHost: true,
    providers: [
        Credentials({
            name: "手机号登录",
            credentials: {
                phone: { label: "手机号码", type: "text" },
                password: { label: "密码", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.phone || !credentials?.password) return null;

                const phone = String(credentials.phone);
                const password = String(credentials.password);

                const user = await prisma.user.findUnique({
                    where: { phone },
                    include: {
                        staffProfiles: {
                            where: { isActive: true },
                            include: { shop: true },
                            orderBy: { createdAt: "asc" },
                            take: 1,
                        },
                    },
                });

                if (!user || !user.password) return null;

                const valid = await bcrypt.compare(password, user.password);
                if (!valid) return null;

                const authUser: AuthUser = {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    phone: user.phone,
                    profileCompleted: user.profileCompleted,
                    telegramUsername: user.telegramUsername ?? null,
                    preferredContactChannel: user.preferredContactChannel,
                    staffShopId: user.staffProfiles[0]?.shopId ?? null,
                    staffShopSlug:
                        user.staffProfiles[0]?.shop.slug ??
                        (user.role === "ADMIN" ? DEFAULT_SHOP_SLUG : null),
                };

                return authUser;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            const typedToken = token as typeof token & Partial<TokenFields>;

            if (user) {
                const typedUser = user as AuthUser;

                typedToken.id = typedUser.id;
                typedToken.role = typedUser.role;
                typedToken.phone = typedUser.phone;
                typedToken.profileCompleted = typedUser.profileCompleted;
                typedToken.telegramUsername = typedUser.telegramUsername;
                typedToken.preferredContactChannel = typedUser.preferredContactChannel;
                typedToken.staffShopId = typedUser.staffShopId;
                typedToken.staffShopSlug = typedUser.staffShopSlug;
            }

            if (trigger === "update" && session) {
                const updatedSession = session as Partial<SessionUserFields>;

                if (updatedSession.telegramUsername !== undefined) {
                    typedToken.telegramUsername = updatedSession.telegramUsername;
                }

                if (updatedSession.preferredContactChannel !== undefined) {
                    typedToken.preferredContactChannel =
                        updatedSession.preferredContactChannel;
                }
            }

            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                const typedSessionUser = session.user as typeof session.user &
                    SessionUserFields;
                const typedToken = token as typeof token & Partial<TokenFields>;

                if (
                    typedToken.id &&
                    typedToken.role &&
                    typedToken.phone &&
                    typedToken.profileCompleted !== undefined
                ) {
                    typedSessionUser.id = typedToken.id;
                    typedSessionUser.role = typedToken.role;
                    typedSessionUser.phone = typedToken.phone;
                    typedSessionUser.profileCompleted = typedToken.profileCompleted;
                    typedSessionUser.telegramUsername =
                        typedToken.telegramUsername ?? null;
                    typedSessionUser.preferredContactChannel =
                        typedToken.preferredContactChannel ?? "PHONE";
                    typedSessionUser.staffShopId = typedToken.staffShopId ?? null;
                    typedSessionUser.staffShopSlug = typedToken.staffShopSlug ?? null;
                }
            }

            return session;
        },
    },
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
});
