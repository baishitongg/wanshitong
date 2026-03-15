import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Returns a singleton Socket.IO client.
 * Safe to call multiple times — only one connection is created.
 */
export function getSocket(): Socket {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_SITE_URL ?? "", {
            path: "/api/socket",
            transports: ["websocket", "polling"],
        });
    }
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

// Event name constants — import these instead of raw strings
export const SOCKET_EVENTS = {
    NEW_ORDER: "new_order",
    ORDER_UPDATED: "order_updated",
    CONNECT: "connect",
    DISCONNECT: "disconnect",
} as const;