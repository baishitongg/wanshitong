import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: string;
            phone: string;
            profileCompleted: boolean;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        role: string;
        phone: string;
        profileCompleted: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        phone: string;
        profileCompleted: boolean;
    }
}