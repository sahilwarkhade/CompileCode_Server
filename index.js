const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

// If you need to handle the `fileURLToPath` functionality:
// const { URL } = require('url');
// const fileURLToPath = (url) => new URL(url).pathname;


const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    }
});

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

app.use(express.static('dist'))
// app.use((req, res, next) => {
//     res.sendFile(path.join(__dirname, 'dist', 'index.html'))
// })


const rooms = {}; 

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join', ({ roomId, username }) => {
        socket.data.username = username;
        socket.join(roomId);

        if (!username || username.trim() === '') {
          socket.emit('join-error', 'Username is required');
          return;
        }

        if (!rooms[roomId]) {
            rooms[roomId] = { clients: {} };
        }

        delete rooms[roomId].clients[username];

        rooms[roomId].clients[username] = { socketId: socket.id, username };

        const clientList = Object.values(rooms[roomId].clients);

        io.to(roomId).emit('join', {
            clients: clientList,
            username,
            socketId: socket.id,
        });

        console.log(`${username} joined room ${roomId}`);
        console.log('Existing clients in room:', clientList);
    });

    socket.on('code-change', ({ roomId, code }) => {
        socket.in(roomId).emit('code-change', { code });
    });

    socket.on('sync-code', ({ socketId, code }) => {
        io.to(socketId).emit('code-change', { code });
    });

    socket.on('language:change', ({ roomId, language }) => {
        socket.in(roomId).emit('language:change', { language });
    });

    socket.on('output-details', ({ roomId, outputDetails }) => {
        socket.in(roomId).emit('output-details', { outputDetails });
    });

    socket.on('disconnecting', () => {
        const rooms = Object.keys(socket.rooms);
        rooms.forEach((roomId) => {
            if (roomId !== socket.id) {
                
                const room = rooms[roomId];
                const clientUsername = socket.data.username;
                delete room.clients[clientUsername];

                const clientList = Object.values(room.clients);

                io.to(roomId).emit('join', {
                    clients: clientList,
                    username: clientUsername,
                    socketId: socket.id,
                });
            }
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));

