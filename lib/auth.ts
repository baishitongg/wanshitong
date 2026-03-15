import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

                const user = await prisma.user.findUnique({
                    where: { phone: credentials.phone as string },
                });

                if (!user || !user.password) return null;

                const valid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );
                if (!valid) return null;

                return {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    phone: user.phone,
                    profileCompleted: user.profileCompleted,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.phone = (user as any).phone;
                token.profileCompleted = (user as any).profileCompleted;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
                (session.user as any).phone = token.phone;
                (session.user as any).profileCompleted = token.profileCompleted;
            }
            return session;
        },
    },
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
});