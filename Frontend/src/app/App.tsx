import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CanvasDesignerPage } from "../features/canvas/components/CanvasDesignerPage";
import { MonitoringDashboard } from "../features/monitoring/components/MonitoringDashboard";
import { Toaster } from "sonner";

function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="top-right"
        offset={64}
        theme="dark"
        toastOptions={{
          style: {
            background: "#12161F",
            border: "1px solid #273042",
            color: "#EDF1F7"
          }
        }}
      />
      <Routes>
        <Route path="/" element={<CanvasDesignerPage />} />
        <Route path="/deployments/:deploymentId" element={ <MonitoringDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;