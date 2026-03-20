export type Role = "CUSTOMER" | "STAFF" | "ADMIN";

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
    category?: { id: string; name: string };
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface Address {
    id: string;
    userId: string;
    label: string | null;
    recipient: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
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
    customerName: string | null;
    customerPhone: string | null;
    telegramUsername: string | null;
    notes: string | null;
    // Delivery address snapshot
    addressId: string | null;
    deliveryRecipient: string | null;
    deliveryPhone: string | null;
    deliveryStreet: string | null;
    deliveryCity: string | null;
    deliveryState: string | null;
    deliveryPostcode: string | null;
    deliveryCountry: string | null;
    items: OrderItem[];
    user?: CurrentUser | null;
    createdAt: string;
    updatedAt: string;
}

export interface CurrentUser {
    id: string;
    name: string | null;
    phone: string;
    telegramUsername?: string | null;
    role: Role;
    profileCompleted: boolean;
}