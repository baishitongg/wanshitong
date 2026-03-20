import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type AuthUser = {
    id: string;
    name: string | null;
    role: string;
    phone: string;
    profileCompleted: boolean;
};

type SessionUserFields = {
    id: string;
    role: string;
    phone: string;
    profileCompleted: boolean;
};

type TokenFields = {
    id: string;
    role: string;
    phone: string;
    profileCompleted: boolean;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
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
                };

                return authUser;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                const typedUser = user as AuthUser;
                const typedToken = token as typeof token & Partial<TokenFields>;

                typedToken.id = typedUser.id;
                typedToken.role = typedUser.role;
                typedToken.phone = typedUser.phone;
                typedToken.profileCompleted = typedUser.profileCompleted;
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
                }
            }

            return session;
        },
    },
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
});