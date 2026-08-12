import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import { subscribeToDeployment } from "./infra/pubsub";
import { WebSocketMessage } from "@shared/types/WebSocketMessage.types"

const httpSever = http.createServer((req: any, res: any) => {
  console.log("Http server 3001 connected successfully. The first handshake for websocket server.");
  res.end("Http server 3001 connected successfully. The first handshake for websocket server.")
});

const wss = new WebSocketServer({ server: httpSever });

wss.on("connection", (socket) => {
  socket.on("error", (err) => console.error(err));

  socket.on("message", (data, isBinary) => {
    try {
      const message = JSON.parse(data.toString());

      if(message.type === WebSocketMessage.Subscribe) {
        const { deploymentId } = message;

        console.log(`Client subscribed to deployment: ${deploymentId}`);
        
        // Subscribe to redis pub/sub for this deployment
        subscribeToDeployment(deploymentId, (event) => {
          // Forward event to this specific client
          if(socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify(event));
          }
        })
      }
    }
    catch (err) {
        console.error("Invalid message from client: "+ err);
      }
  });

  socket.on("close", () => {
    console.log("Client disconnected");
    // Redis subscriptions auto cleanup when connection closes because subscriber.quit() is not called. Will fix later.
  })
});

httpSever.listen(3001);

// To make a connection with the websocket server
// 1. 
// On one terminal run bun run ws-server.ts
// 2.
// On second terminal run bunx wscat -c ws://localhost:3001
// 3.
// And send the request from postman on route /api/deployments
// And in the body send the { "infrastructureId": "ee893045-3288-4cc0-bdce-6a04e29c0bda" }
// And in the termimal with the websocket connection i.e. bunx wscat -c ws://localhost:3001
// 4.
// Enter the command {"type": "subscribe", "deploymentId": "your-deployment-id"} 
// And your-deployment-id will be the id that u will get of the deployment in the response of the postman request to /api/deployments