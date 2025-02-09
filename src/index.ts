import { readFileSync } from "fs";
import { resolve } from "path";
import { createServer } from "http";

import express, { Response } from "express";
import WebSocket, { createWebSocketStream, WebSocketServer } from "ws";

import { env } from "./env";

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/connect', maxPayload: 1024 * 1024 });

const rooms = new Map<string, WebSocket | string>();
const bookingTimeouts = new Map<string, NodeJS.Timeout>();

const createRoomCode = () => {
    let code: string;

    do {
        code = ((Math.floor(Math.random() * 10000) + 10000) + "").slice(1);
    } while(rooms.has(code))

    return code;
}

const bookRoom = () => {
    if(rooms.size == env.MAX_ROOMS) return null;

    const bookingKey = ((Math.random() * 1000000) | 0) + "";
    const code = createRoomCode();

    rooms.set(code, bookingKey);

    bookingTimeouts.set(code, setTimeout(() => {
        rooms.delete(code);
        bookingTimeouts.delete(code);
    }, 10000))

    return { code, bookingKey };
}

if(env.NODE_ENV === "development") {
    app.get("/", (req, res) => {
        const file = readFileSync(resolve(__dirname, "../client/index.html")).toString();
        res.type('html');
        
        if(req.query.code && req.query.key) {
            res.send(file);
        } else {
            const { code, bookingKey  } = bookRoom()!;

            res.send(file.replace("// --BOOKING_MARK--", `BOOKED_CODE = '${code}'; BOOKING_KEY = '${bookingKey}';`));
        }
    })
} else {
    const indexContent = readFileSync(resolve(__dirname, "../client/index.html"));

    const [indexStart, indexEnd] = indexContent.toString().split("// --BOOKING_MARK--");

    app.get("/", (req, res) => {
        res.type('html');

        if(req.query.code && req.query.key) {
            res.send(indexContent);
        } else {
            const booking = bookRoom();

            if(!booking) {
                res.send(indexContent);
            } else {
                res.write(indexStart);
                res.write(`BOOKED_CODE = '${booking.code}'; BOOKING_KEY = '${booking.bookingKey}';`)
                res.end(indexEnd);
            }
        }
    })
}

const sendAuth = (res: Response) => {
    res.setHeader("WWW-Authenticate", 'Basic realm="User Visible Realm", charset="UTF-8"');
    res.status(401).send("Unauthorized")
}

app.get("/admin", (req, res) => {
    if(!req.headers.authorization || !req.headers.authorization.startsWith("Basic ") || req.headers.authorization.length === 6) return sendAuth(res);

    const [username, password] = Buffer.from(req.headers.authorization.slice(6), "base64").toString('utf-8').split(":");

    if(username !== env.ADMIN.USERNAME || password !== env.ADMIN.PASSWORD) {
        return sendAuth(res);
    }

    res.write(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel</title>
</head>
<body>
`)
    for(const [roomCode, roomData] of rooms) {
        res.write(`<div>${roomCode}: ${typeof roomData === "string" ? roomData : `WebSocket`}<button onclick="fetch('/terminate/${roomCode}')">Terminate</button></div>`)
    }
    res.end(`</body></html>`);
})

app.get("/terminate/:room", (req, res) => {
    if(!req.headers.authorization || !req.headers.authorization.startsWith("Basic ") || req.headers.authorization.length === 6) return sendAuth(res);

    const [username, password] = Buffer.from(req.headers.authorization.slice(6), "base64").toString('utf-8').split(":");

    if(username !== env.ADMIN.USERNAME || password !== env.ADMIN.PASSWORD) {
        return sendAuth(res);
    }

    const room = rooms.get(req.params.room);

    if(!room) {
        res.send(404)
        return ;
    }

    if(typeof room === "string") {
        rooms.delete(req.params.room);
        res.status(200).send("OK");
        return
    }

    room.close();

    res.status(200).send("OK");
})

wss.on('connection', (socket, message) => {
    const url = new URL(message.url ?? "", "http://example.com");

    const roomCode = url.searchParams.get("code");
    const bookingKey = url.searchParams.get("bookingKey");

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

    if(bookingKey) {
        const actualBookingKey = rooms.get(roomCode);

        if(typeof actualBookingKey !== "string" || actualBookingKey !== bookingKey) {
            return socket.close(4003); // INVALID BOOKING KEY
        }

        rooms.set(roomCode, socket);
        clearTimeout(bookingTimeouts.get(roomCode));
        bookingTimeouts.delete(roomCode);
        
        socket.once('close', () => {
            rooms.delete(roomCode);
        })
        
        return;
    }

    const host = rooms.get(roomCode);

    if(!host) {
        socket.close(4002); // NO ROOM
        return;
    }

    if(typeof host === "string") {
        return socket.close(4004) // NOT YET EXISTS
    }

    host.removeAllListeners();

    const hostStream = createWebSocketStream(host);
    const clientStream = createWebSocketStream(socket);

    hostStream.pipe(clientStream);
    clientStream.pipe(hostStream);

    host.once('close', () => {
        rooms.delete(roomCode);
        socket.close(1000);
        hostStream.destroy();
        clientStream.destroy();
    })

    socket.once('close', () => {
        rooms.delete(roomCode);
        host.close(1000);
        hostStream.destroy();
        clientStream.destroy();
    })
})

httpServer.listen(env.PORT, env.HOST, () => {
    console.log(`Server started at ${env.HOST}:${env.PORT}`);
})