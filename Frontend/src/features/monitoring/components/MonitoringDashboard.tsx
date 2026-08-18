import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDeploymentSocket } from "@/features/deployment/hooks/useDeploymentSocket";
import { getDeploymentsOfInfrastructure, getSpecificInfrastructure } from "@/api/infrastructure.api";
import { DeploymentStatus } from "@shared/enum/DeploymentStatus.enum";
import { ReadOnlyCanvas } from "./ReadOnlyCanvas";
import { DEPLOYMENT_STAGES_NAMES } from "@shared/constants/DEPLOYMENT_STAGES_NAMES.constants";
import type { Infrastructure } from "@shared/types/Infrastructure.types";
import type { Resource } from "@shared/types/Resource.types";
import type { ChaosEvents } from "@shared/types/ChaosEvents.types";
import type { ConnectionLine } from "@shared/types/ConnectionLine.types";
import type { DeploymentTimeline } from "@shared/types/DeploymentTimeline.types";
import type { Deployment } from "@shared/types/Deployment.types";

export function MonitoringDashboard() {
  const { deploymentId } = useParams<{ deploymentId: string }>();
  const {deployment, status, timeline} = useDeploymentSocket(deploymentId!);
  const [ infrastructure, setInfrastructure] = useState<Infrastructure | null>(null); // Infrastructure becuase deloyment doesn't have resources it only has resourceCount and here we need resources.
  const [ pastDeployments, setPastDeployments] = useState<Deployment[]>([]);

  useEffect(() => {
    const getInfrastructureAndDeployments = async () => {
      if(deployment?.infrastructureId) {
        const Infrastructure = await getSpecificInfrastructure(deployment?.infrastructureId)
        setInfrastructure(Infrastructure);

        const deployments = await getDeploymentsOfInfrastructure(deployment?.infrastructureId);
        setPastDeployments(deployments);
      }
    }
    getInfrastructureAndDeployments();
  }, [deployment?.infrastructureId])

  if(!deployment || !infrastructure) {
    return <div className="h-screen bg-[#0f1117] text-white flex items-center justify-center">
      Loading...
    </div>
  }

  const resources: Resource[] = infrastructure.layout.resources || [];
  const connectionLines: ConnectionLine[] = infrastructure.layout.connectionLines || [];
  const chaosEvents: ChaosEvents[] = deployment.chaosEvents || [];

  return (
    <div className="h-screen bg-[#0f1117] text-white flex flex-col">
      {/* Header */}
      <div className="h-12 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
        <h1 className="text-sm font-semibold">InfraForge - Monitoring</h1>
          <span className={`text-xs ${
            status === DeploymentStatus.COMPLETED ? "text-green-400" :
            status === DeploymentStatus.FAILED ? "text-red-400" :
            status === DeploymentStatus.RUNNING ? "text-blue-400" :
            "text-gray-400"
          }`}>
            { status }
          </span>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Diagram - min area */}
        <div className="flex-1 p-4">
          <ReadOnlyCanvas 
            resources={resources}
            connectionLines={connectionLines}
            chaosEvents={chaosEvents}
          />
        </div>

        {/* Side panels */}
        <div className="w-80 border-l border-gray-800 overflow-y-auto p-4 space-y-4">
          {/* Cost panel - Inside side panel */}
          {deployment.stages?.find(deploymentStage => deploymentStage.name === DEPLOYMENT_STAGES_NAMES[6])?.details && (
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-gray-400 mb-2">Cost Breakdown</h3>
              {Object.entries(
                deployment.stages
                .find(deploymentStage => deploymentStage.name === DEPLOYMENT_STAGES_NAMES[6])
                ?.details?.breakdown as Record<string, number>
              ).map(([type, cost]) => (
                  <div key={type} className="flex justify-between text-xs py-1">
                    <span>{ type }</span>
                    <span className="text-green-400">${ cost }</span>
                  </div>
                )
              )}
            </div>
          )}

          {/* Security panel - Inside side panel  */}
          {deployment.stages?.find(deploymentStage => deploymentStage.name === DEPLOYMENT_STAGES_NAMES[5])?.details && (
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-gray-400 mb-2">Security Issues</h3>
              {deployment.stages.find(deploymentStage => deploymentStage.name === DEPLOYMENT_STAGES_NAMES[5])?.details?.issues?.length === 0 
              ? (
                <p className="text-xs text-green-400">No issues detected</p>
              )
              : (
                deployment.stages.find(deploymentStage => deploymentStage.name === DEPLOYMENT_STAGES_NAMES[5])?.details?.issues.map((
                  issue: string, i: number
                ) => (
                  <p key={i} className="text-xs text-amber-400 py-1">⚠ {issue}</p>
                ))
              )}
            </div>
          )}

          {/* Timeline - Inside side panel */}
          <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-gray-400 mb-2">Timeline</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {timeline.map((entry: DeploymentTimeline, i: number) => (
                <div key={i} className="text-xs flex gap-2">
                  <span className="text-gray-600 shrink-0">{ new Date(entry.timestamp).toLocaleTimeString() }</span>
                  <span className="text-gray-400">{ entry.event }</span>
                </div>
              ))}
            </div>
          </div>

          {/* Deployment History */}
          <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-gray-400 mb-2">Past Deployments</h3>
              {pastDeployments.length === 0 ? (
                <p className="text-xs text-gray-600">No past deployments</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {pastDeployments.map(pastDeployment => (
                    <div key={pastDeployment.id} className="text-xs flex items-center justify-between">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          pastDeployment.status === DeploymentStatus.COMPLETED ? "bg-green-500" :
                          pastDeployment.status === DeploymentStatus.FAILED ? "bg-red-500" :
                          pastDeployment.status === DeploymentStatus.RUNNING ? "bg-blue-500 animate-pulse" :
                          "bg-gray-600"
                        }`}
                      />
                      <span className="text-gray-400 truncate flex-1 ml-2">
                        {new Date(pastDeployment.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-gray-500">
                        {pastDeployment.resourceCount} resources
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}