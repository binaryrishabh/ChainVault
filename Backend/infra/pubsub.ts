import { redis } from "./redis";

// as soon as a worker will complete each stage it will call this function to publish so that web socket server could pick and tell to the designated client waiting for the designated deploymentId...
export const publishDeploymentUpdate = async(deploymentId: string, stage: string, status: string, message: string) => {
  const event = JSON.stringify({
    deploymentId, // This helps to route to the designated client via websocker server
    stage, // whcih of the 7 stages completed
    status, // running, completed, failed
    message, // tells what has been doen the details about the event
    timestamp: new Date().toISOString()
  });
  await redis.publish(`deployment:${deploymentId}:updates`, event); // this sends the message to the redis channel i.e. shouts that this event of the deployment has been completed such that all the subsrcibers could listen.
}


// this is to where all websocket servers are listening to and listens when there deploymentId matches or the client that's wanting the deploymentId matches
export const subscribeDeployment = async(deploymentId: string, callback: (event: any) => void) => { // this callback function is passed by the websocket server
  const subscriber = redis.duplicate(); // we are creating a new redis connection. Here redis connection by subscriber can only subscribe they won't be allowed to do any thing else that's ahy making new redis connection for each subscriptions. This is scaling so that subscribers don't block the publishing queing and chaching things server.
  
  await subscriber.subscribe(`deployment:${deploymentId}:updates`); // shouts for specific deploymentId and websocket subscribes to the particular one can listen.

  subscriber.on("message", (channel, message) => { // event listener. Fires every time a message arrives on the subscribed channel.
    const event = JSON.parse(message); // json string conversion to string
    callback(event); // passes the event to the WebSocket server, which forwards it to the frontend. Because this function has been passed by the websocket server itself. SO we call here it with the message event
  })

  return subscriber;
}
