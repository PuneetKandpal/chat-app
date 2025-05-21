import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // fromUserId: '682c9e34b6419179b42d0355',
  // toUserId: '682c9d473c1d0e142d38c1e0'
  socket.on("startTyping", (data) => {
    console.log("startTyping", data);
  const { fromUserId, toUserId } = data;
  const receiverSocketId = getReceiverSocketId(toUserId);
  if (receiverSocketId) {
    console.log("beginTyping", receiverSocketId, { fromUserId });
    io.to(receiverSocketId).emit("beginTyping", { fromUserId });
  }
  });

  socket.on("stopTyping", (data) => {
    console.log("stopTyping", data);
    const { fromUserId, toUserId } = data;
    const receiverSocketId = getReceiverSocketId(toUserId);
    if (receiverSocketId) {
      console.log("endTyping", receiverSocketId, { fromUserId });
      io.to(receiverSocketId).emit("endTyping", { fromUserId });
    }
  });


  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

});

export { io, app, server };
