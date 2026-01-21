import { io } from "socket.io-client";

// This connects to a free testing server or your own backend
const socket = io("https://weakest-link-server.up.railway.app");

export default socket;
