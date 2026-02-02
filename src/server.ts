import http from "http";
import app from "./app";
import { initSocket } from "./socket";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Socket.io init
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
