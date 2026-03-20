import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: string;
            phone: string;
            profileCompleted: boolean;
            telegramUsername: string | null;
            preferredContactChannel: "PHONE" | "TELEGRAM";
            staffShopId: string | null;
            staffShopSlug: string | null;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        role: string;
        phone: string;
        profileCompleted: boolean;
        telegramUsername: string | null;
        preferredContactChannel: "PHONE" | "TELEGRAM";
        staffShopId: string | null;
        staffShopSlug: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        phone: string;
        profileCompleted: boolean;
        telegramUsername: string | null;
        preferredContactChannel: "PHONE" | "TELEGRAM";
        staffShopId: string | null;
        staffShopSlug: string | null;
    }
}
