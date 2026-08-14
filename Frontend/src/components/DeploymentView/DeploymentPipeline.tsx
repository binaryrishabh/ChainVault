import { useEffect, useState } from "react";
import { DEPLOYMENT_STAGES } from "@shared/constants/DEPLOYMENT_STAGES.constants";
import { Publish } from "@shared/types/Publish.types";
import { WebSocketMessage } from "@shared/types/WebSocketMessage.types";
import type { Timeline } from "@shared/types/Timeline.types";
import { getSpecificDeployment } from "@/api/api";
import type { Deployment } from "@shared/types/Deployment.types";

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
    let isClose = false; // Component unmounted cleanup the ws connection
    let isServerStateFailed = false; // Deployment done or failed, so stop reconnecting and close wx connection.

    let ws: WebSocket;
    let retries = 0;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = async () => {
      // i. First fetch current state from DB
      try {
        const deployment: Deployment = await getSpecificDeployment(deploymentId);
        
        if(deployment && !isClose) {
          // Restore pipeline state from Database
          setStatus(deployment.status);
          setCompletedStages(
            (deployment.stages || [])
            .filter((stage: any) => stage.status === "completed")
            .map((stage: any) => stage.name)
          )

          setTimeline(prev => { // prev = current UI timeline [A, B, C]
            const dbTimeline = deployment.timeline || []; // db timeline = [A, B, C, D, E, F] if worker drop and database went ahead and ui left behind

            // Check what is already there in timeline of UI.
            const isAlreadyInUI = (entry: Timeline) => {
              return prev.some(p => 
                p.timestamp === entry.timestamp && p.event === entry.event && p.message === entry.message
              )
            }

            const missing = dbTimeline.filter(entry => !isAlreadyInUI(entry));

            return [...prev, ...missing]; // Returns present state of timeline from dp
          });

          //If deployment already in it's final stage or completely failed by the worker server, don't open ws connection
          if(deployment.status === "completed") {
            isServerStateFailed = true;
            onDeploymentComplete();
            return;
          }
          if(deployment.status === "failed") {
            isServerStateFailed = true;
            onDeploymentFailed();
            return;
          }
        }
      }
      catch (err) {
        console.log("Resync of deployment status from DB failed: "+ err);
      }

      // ii. Now open websoket for live updates
      ws = new WebSocket("ws://localhost:3001");

      ws.onopen = () => {
        if(!isClose) {
          retries = 0; // set it to 0 so after each connection retry starts exponential from 2 sec.
          ws.send(JSON.stringify({ type: WebSocketMessage.Subscribe, deploymentId }));
        }
      }

      ws.onmessage = (event) => {
        if (isClose) {
          return;
        }
        const data = JSON.parse(event.data);

        switch (data.publishType) {
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
            isServerStateFailed = true; // queue failed to push the deployment so no need to retry the ws connection
            onDeploymentFailed();
            ws.close();
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
            isServerStateFailed = true; // The deplyment itself got completed so no need for retry the ws connection
            ws.close();
            break;

          case Publish.publishDeploymentFailed:
            setStatus("failed");
            onDeploymentFailed();
            setTimeline(prev => [...prev, {
              event: "Deployment Failed",
              message: data.message,
              timestamp: data.timestamp
            }]);
            isServerStateFailed = true; // The deployment itself failed so no need to retry the ws connection
            ws.close();
            break;
        }
      }

      ws.onclose = () => {
        if(isClose || isServerStateFailed) { // If component unmonted or server itself failed completely we don't reconnect
          return;
        }

        // The delay will increase exponentially i.e. 2, 4, 8, 16, then capped at 30...
        const delay = Math.min(30000, 1000 * 2 ** retries);
        retries++;
        reconnectTimeout = setTimeout(connect, delay);
      }

      ws.onerror = () => {
        if(!isClose) {
          setStatus("connection error");
          ws.close();
        }
      }
    }

    connect();

    return () => {
      isClose = true;
      if(reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if(ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    }
  }, [deploymentId, onDeploymentComplete, onDeploymentFailed]);

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