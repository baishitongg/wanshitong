export type Role = "CUSTOMER" | "ASSISTANT" | "ADMIN";

export type OrderStatus =
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "DONE"
    | "CANCELLED";

export interface Category {
    id: string;
    name: string;
}

export interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    imageUrl: string | null;
    status: boolean;
    categoryId: string;
    category: Category;
    createdAt: string;
}

export interface OrderItem {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    product: Pick<Product, "id" | "name" | "imageUrl">;
}

export interface Order {
    id: string;
    userId: string | null;
    guestSession: string | null;
    status: OrderStatus;
    totalAmount: number;
    whatsappNumber: string | null;
    customerName: string | null;
    customerEmail: string | null;
    notes: string | null;
    items: OrderItem[];
    createdAt: string;
    updatedAt: string;
}

export interface CurrentUser {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    whatsappNumber: string | null;
    profileCompleted: boolean;
}