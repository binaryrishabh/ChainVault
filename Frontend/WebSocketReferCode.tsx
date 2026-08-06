import { useEffect, useState } from "react";

function App() {
  const [webSocketConnection, setWebSocketConnection] = useState<null | WebSocket>(null);
  const [currentText, setCurrentText] = useState<string>("");
  const [latestMessage, setLatestMessage] = useState<string>("");

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3001")
    socket.onopen = () => {
      console.log("connected");
      setWebSocketConnection(socket);
    }
    socket.onmessage = (message) => {
      setLatestMessage(message.data);
    }

    // return () => clear(socket);
  }, [])

  if(!webSocketConnection) {
    return <div>
      Connection to WebSocket failed
    </div>
  }
  return <div>
    <input onChange={(event) => {
      setCurrentText(event.target.value)
    }}/>
    <button
      onClick={() => {
        webSocketConnection.send(currentText);
        setCurrentText("");
      }}
    >
      Send
    </button>
    {latestMessage}
  </div>
}

export default App;