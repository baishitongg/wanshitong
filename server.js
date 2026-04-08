/* eslint-disable @typescript-eslint/no-require-imports */

// server.js — Custom Node.js entry point.
// Run with: node server.js  (or via PM2: pm2 start ecosystem.config.js)
// This file attaches Socket.IO to the same HTTP server that Next.js uses.

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3001", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Attach Socket.IO to the HTTP server
  const io = new Server(httpServer, {
    path: "/api/socket",
    cors: {
      origin: process.env.NEXT_PUBLIC_SITE_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  // Make io available globally so API routes can emit events
  global.io = io;

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on("join_assistants", () => {
      socket.join("assistants");
      console.log(`[Socket.IO] ${socket.id} joined assistants room`);
    });

    socket.on("join_shop_staff", (shopId) => {
      if (typeof shopId !== "string" || !shopId.trim()) {
        return;
      }

      const room = `shop:${shopId}`;
      socket.join(room);
      console.log(`[Socket.IO] ${socket.id} joined ${room}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
