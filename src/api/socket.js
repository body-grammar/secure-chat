import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";

const socket = io(SOCKET_URL, {
  autoConnect: false,
});

export const connectSocket = (token) => {
  if (socket.connected) {
    socket.disconnect();
  }

  socket.auth = { token };
  socket.connect();
};

export default socket;