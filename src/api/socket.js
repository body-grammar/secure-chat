import { io } from "socket.io-client";

const socket = io("http://localhost:5001", {
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