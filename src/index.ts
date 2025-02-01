import { readFileSync } from "fs";
import { resolve } from "path";
import { createServer } from "http";

import express from "express";
import WebSocket, { createWebSocketStream, WebSocketServer } from "ws";

import { env } from "./env";

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/connect' });

if(env.NODE_ENV === "development") {
    app.get("/", (_, res) => {
        res.sendFile(resolve(__dirname, "../client/index.html"))
    })
} else {
    const indexContent = readFileSync(resolve(__dirname, "../client/index.html"));

    app.get("/", (_, res) => {
        res.type('html');
        res.send(indexContent);
    })
}


const rooms = new Map<string, WebSocket>();

const createRoomCode = () => {
    let code: string;

    do {
        code = ((Math.floor(Math.random() * 10000) + 10000) + "").slice(1);
    } while(rooms.has(code))

    return code;
}

wss.on('connection', (socket, message) => {
    const url = new URL(message.url ?? "", "http://example.com");

    const roomCode = url.searchParams.get("code");

    if(!roomCode) {
        if(rooms.size == env.MAX_ROOMS) return socket.close(4001); // MAX ROOMS

        const code = createRoomCode();

        rooms.set(code, socket);

        socket.send(code);

        socket.once('close', () => {
            rooms.delete(code);
        })
        
        return;
    }

    const host = rooms.get(roomCode);

    if(!host) {
        socket.close(4002); // NO ROOM
        return;
    }
    rooms.delete(roomCode);

    host.removeAllListeners();

    const hostStream = createWebSocketStream(host);
    const clientStream = createWebSocketStream(socket);

    hostStream.pipe(clientStream);
    clientStream.pipe(hostStream);

    host.once('close', () => {
        socket.close(1000);
        hostStream.destroy();
        clientStream.destroy();
    })

    socket.once('close', () => {
        host.close(1000);
        hostStream.destroy();
        clientStream.destroy();
    })
})

httpServer.listen(env.PORT, env.HOST, () => {
    console.log(`Server started at ${env.HOST}:${env.PORT}`);
})