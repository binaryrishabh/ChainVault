import { useEffect, useState } from "react";
import { DEPLOYMENT_STAGES } from "@shared/constants/DEPLOYMENT_STAGES.constants";
import { Publish } from "@shared/types/Publish.types";
import { WebSocketMessage } from "@shared/types/WebSocketMessage.types";
import type { Timeline } from "@/frontendTypes/Timeline.types";


interface DeploymentPipelineProps {
  deploymentId: string;
  onDeploymentPreviewClose: () => void;
  onDeploymentComplete: () => void;
  onDeploymentFailed: () => void;
}

export function DeploymentPipeline({ deploymentId, onDeploymentPreviewClose, onDeploymentComplete, onDeploymentFailed }: DeploymentPipelineProps) {
  const [ status, setStatus ] = useState<string>("pending");
  const [ completedStages, setCompletedStages ] = useState<string[]>([]);
  const [ timeline, setTimeline ] = useState<Array<Timeline>>([]);

  useEffect(() => {
    let isClose = false; // To prevent the react strict mode to close the websocket connection due to running of useEffect 2 times. 

    const ws = new WebSocket("ws://localhost:3001");

    ws.onopen = () => {
      if(!isClose) {
        ws.send(JSON.stringify({ type: WebSocketMessage.Subscribe, deploymentId }))
      }
    }

    ws.onmessage = (event) => {
      if (!isClose) {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case Publish.publishChaosInjected:
            setTimeline(prev => [...prev, {
              event: "Chaos Injected",
              message: `${data.message}`,
              timestamp: data.timestamp
            }]);
            break;

          case Publish.publishOutboxFailed:
            setStatus("failed");
            setTimeline(prev => [...prev, {
              event: "Outbox Failed",
              message: data.message,
              timestamp: data.timestamp
            }]);
            break;

          case Publish.publishDeploymentStarted:
            setStatus("running");
            setTimeline(prev => [...prev, {
              event: "Deployment Started",
              message: data.message,
              timestamp: data.timestamp
            }]);
            break;

          case Publish.publishStageCompleted:
            setCompletedStages(prev => [...prev, data.stageName]);
            setTimeline(prev => [...prev, {
              event: data.stageName,
              message: data.message,
              timestamp: data.timestamp
            }]);
            break;

          case Publish.publishDeploymentCompleted:
            setStatus("completed");
            onDeploymentComplete();
            setTimeline(prev => [...prev, {
              event: "Deployment Completed",
              message: data.message,
              timestamp: data.timestamp
            }]);
            break;

          case Publish.publishDeploymentFailed:
            setStatus("failed");
            onDeploymentFailed();
            setTimeline(prev => [...prev, {
              event: "Deployment Failed",
              message: data.message,
              timestamp: data.timestamp
            }]);
            break;
        }
      }
    }

    ws.onerror = () => {
      if(!isClose) {
        setStatus("connection error");
      }
    }

    return () => {
      isClose = true;
      if(ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
  }, [deploymentId]);

  return (
    <div className="fixed bottom-0 left-16 right-0 bg-gray-950 border-t border-gray-800 p-4 z-40">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">
            Deployment:{" "}
            <span
              className={`${
                status === "running"
                  ? "text-blue-400"
                  : status === "completed"
                  ? "text-green-400"
                  : status === "failed"
                  ? "text-red-400"
                  : "text-gray-400"
              }`}
            >
              { status }
            </span>
        </h3>
        <button onClick={onDeploymentPreviewClose} className="text-gray-500 hover:text-white text-xs cursor-pointer">
          X Close
        </button>
      </div>

      {/* Pipeline bars */}
      <div className="flex gap-1.5 mb-3">
        {DEPLOYMENT_STAGES.map((stage) => {
          const isCompleted = completedStages.includes(stage);
          const isCurrent = 
            completedStages.length === DEPLOYMENT_STAGES.indexOf(stage) && status === "running";
          const isFailed = 
            status === "failed" && !isCompleted && completedStages.length === DEPLOYMENT_STAGES.indexOf(stage);
          
            return (
              <div key={stage} className="flex-1">
                <div
                  className={`h-2 rounded-full transition-colors duration-300 ${
                    isCompleted
                      ? "bg-green-500"
                      : isFailed
                      ? "bg-red-500"
                      : isCurrent
                      ? "bg-blue-500 animate-pulse"
                      : "bg-gray-800"
                  }`}
                />
                <p className="text-[10px] text-gray-500 mt-1 text-center truncate">{stage}</p>
              </div>
            )
        })}
      </div>
      {/* Timeline */}
      <div className="max-h-24 overflow-y-auto text-xs text-gray-400 space-y-0.5">
        {timeline.map((entry, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-gray-600 shrink-0 w-20">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            <span className="text-gray-500 shrink-0 w-35">
              {entry.event}
            </span>
            <span>
              {entry.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  )  
}