import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DndContextComponent } from "./components/CanvasPage/DndContextComponent";
import { MonitoringDashboard } from "./components/MonitoringView/MonitoringDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DndContextComponent />} />
        <Route path="/deployments/:deploymentId" element={ <MonitoringDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;