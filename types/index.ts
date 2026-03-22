export type Role = "CUSTOMER" | "STAFF" | "ADMIN";
export type ShopType = "PRODUCT" | "SERVICE" | "HYBRID";
export type CheckoutMode = "DELIVERY" | "BOOKING" | "FLEXIBLE";
export type ItemType = "PHYSICAL" | "SERVICE";
export type FulfillmentType = "DELIVERY" | "PICKUP" | "BOOKING";
export type OrderFlowType = "DELIVERY" | "PICKUP" | "BOOKING";
export type ServiceLocationType = "ONSITE" | "CUSTOMER_PLACE" | "ONLINE";
export type ServiceWeekday =
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";

export type OrderStatus =
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "DONE"
    | "CANCELLED";

export interface Category {
    id: string;
    shopId: string;
    name: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

export interface Product {
    id: string;
    shopId: string;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    imageUrl: string | null;
    status: boolean;
    categoryId: string;
    itemType: ItemType;
    fulfillmentType: FulfillmentType;
    requiresScheduling: boolean;
    durationMinutes: number | null;
    minAdvanceHours: number | null;
    maxAdvanceDays: number | null;
    requiresAddress: boolean;
    requiresContact: boolean;
    attributes?: unknown | null;
    category?: { id: string; name: string };
    shop?: { id: string; name: string; slug: string };
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface ServiceTimeRange {
    start: string;
    end: string;
}

export interface ServiceAvailabilityDay {
    day: ServiceWeekday;
    enabled: boolean;
    slots: ServiceTimeRange[];
}

export interface ServiceSlot {
    key: string;
    date: string;
    start: string;
    end: string;
    label: string;
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
    itemType?: ItemType | null;
    fulfillmentType?: FulfillmentType | null;
    scheduledDate?: string | null;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    product: Pick<Product, "id" | "name" | "imageUrl">;
}

export interface Order {
    id: string;
    shopId: string;
    userId: string | null;
    guestSession: string | null;
    status: OrderStatus;
    totalAmount: number;
    flowType: OrderFlowType;
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
    scheduledDate: string | null;
    scheduledStartTime: string | null;
    scheduledEndTime: string | null;
    serviceLocationType: ServiceLocationType | null;
    serviceAddressText: string | null;
    bookingReference: string | null;
    items: OrderItem[];
    shop?: { id: string; name: string; slug: string } | null;
    user?: CurrentUser | null;
    createdAt: string;
    updatedAt: string;
}

export interface Shop {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    heroTitle: string | null;
    heroSubtitle: string | null;
    heroImageUrl: string | null;
    whatsappPhone: string | null;
    telegramUsername: string | null;
    shopType: ShopType;
    checkoutMode: CheckoutMode;
    themePrimary: string | null;
    themeSecondary: string | null;
    themeAccent: string | null;
    themeSurface: string | null;
    logoUrl: string | null;
    homepageVariant: string | null;
    status: "ACTIVE" | "INACTIVE";
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

export interface CurrentUser {
    id: string;
    name: string | null;
    phone: string;
    telegramUsername?: string | null;
    role: Role;
    profileCompleted: boolean;
}
