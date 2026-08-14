import { useEffect, useState } from "react";
import { getSpecificDeployment } from "@/api/api";
import { DEPLOYMENT_STAGES_NAMES } from "@shared/constants/DEPLOYMENT_STAGES_NAMES.constants";
import { Publish } from "@shared/enum/Publish.enum";
import { WebSocketMessage } from "@shared/enum/WebSocketMessage.enum";
import { DeploymentStageStatus } from "@shared/enum/DeploymentStageStatus.enum";
import { DeploymentStatus, type DeploymentStatusType } from "@shared/enum/DeploymentStatus.enum";
import { DeploymentTimelineEventNames } from "@shared/enum/DeploymentTimelineEventNames.enum"
import type { DeploymentTimeline } from "@shared/types/DeploymentTimeline.types";
import type { Deployment } from "@shared/types/Deployment.types";
import type { DeploymentStages } from "@shared/types/DeploymentStages.types"


const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3001";

interface DeploymentPipelineProps {
  deploymentId: string;
  onDeploymentPreviewClose: () => void;
  onDeploymentComplete: () => void;
  onDeploymentFailed: () => void;
}

type PipelineUIStatus = DeploymentStatusType | "Web Socket connection error";

export function DeploymentPipeline({ deploymentId, onDeploymentPreviewClose, onDeploymentComplete, onDeploymentFailed }: DeploymentPipelineProps) {
  const [ status, setStatus ] = useState<PipelineUIStatus>(DeploymentStatus.PENDING);
  const [ completedStages, setCompletedStages ] = useState<string[]>([]);
  const [ timeline, setTimeline ] = useState<Array<DeploymentTimeline>>([]);

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
            .filter((stage: DeploymentStages) => stage.status === DeploymentStageStatus.COMPLETED)
            .map((stage: DeploymentStages) => stage.name)
          )

          setTimeline(deployment.timeline || []);

          //If deployment already in it's final stage or completely failed by the worker server, don't open ws connection
          if(deployment.status === DeploymentStatus.COMPLETED) {
            isServerStateFailed = true;
            onDeploymentComplete();
            return;
          }
          if(deployment.status === DeploymentStatus.FAILED) {
            isServerStateFailed = true;
            onDeploymentFailed();
            return;
          }
        }
      }
      catch (err) {
        console.log("Resync of deployment status from DB failed: "+ err);
      }

      // Check isClose before creating WebSocket
      if(isClose) {
        return;
      }

      // ii. Now open websoket for live updates
      ws = new WebSocket(WS_URL);

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
              event: DeploymentTimelineEventNames.ChaosInjected,
              message: `${data.message}`,
              timestamp: data.timestamp
            }]);
            break;

          case Publish.publishOutboxFailed:
            setStatus(DeploymentStatus.FAILED);
            setTimeline(prev => [...prev, {
              event: DeploymentTimelineEventNames.OutboxFailed,
              message: data.message,
              timestamp: data.timestamp
            }]);
            isServerStateFailed = true; // queue failed to push the deployment so no need to retry the ws connection
            onDeploymentFailed();
            ws.close();
            break;

          case Publish.publishDeploymentStarted:
            setStatus(DeploymentStatus.RUNNING);
            setTimeline(prev => [...prev, {
              event: DeploymentTimelineEventNames.DeploymentStarted,
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
            setStatus(DeploymentStatus.COMPLETED);
            onDeploymentComplete();
            setTimeline(prev => [...prev, {
              event: DeploymentTimelineEventNames.DeploymentCompleted,
              message: data.message,
              timestamp: data.timestamp
            }]);
            isServerStateFailed = true; // The deplyment itself got completed so no need for retry the ws connection
            ws.close();
            break;

          case Publish.publishDeploymentFailed:
            setStatus(DeploymentStatus.FAILED);
            onDeploymentFailed();
            setTimeline(prev => [...prev, {
              event: DeploymentTimelineEventNames.DeploymentFailed,
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
          setStatus("Web Socket connection error");
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
                status === DeploymentStatus.RUNNING
                  ? "text-blue-400"
                  : status === DeploymentStatus.COMPLETED
                  ? "text-green-400"
                  : status === DeploymentStatus.FAILED
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
        {DEPLOYMENT_STAGES_NAMES.map((stageName) => {
          const isCompleted = completedStages.includes(stageName);
          const isCurrent = 
            completedStages.length === DEPLOYMENT_STAGES_NAMES.indexOf(stageName) && status === DeploymentStatus.RUNNING;
          const isFailed = 
            status === DeploymentStatus.FAILED && !isCompleted && completedStages.length === DEPLOYMENT_STAGES_NAMES.indexOf(stageName);
          
            return (
              <div key={stageName} className="flex-1">
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
                <p className="text-[10px] text-gray-500 mt-1 text-center truncate">{stageName}</p>
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