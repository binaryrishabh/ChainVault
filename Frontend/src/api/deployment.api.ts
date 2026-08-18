import axios from "axios";

import type { Deployment } from "@shared/types/Deployment.types";
import { API_URL } from "./httpClient";

/* ------------------Deployment api calls--------------- */
// Create new deployment
export const createDeployment = async(infrastructureId: string): Promise<Deployment> => {
  const response = await axios.post(`${API_URL}/deployments`, {
    infrastructureId
  })

  console.log(response.data.createdDeployment.id);

  return response.data.createdDeployment;
}

// Fetch data of existing deployment
export const getSpecificDeployment = async(deploymentId: string): Promise<Deployment> => {
  const response = await axios.get(`${API_URL}/deployments/${deploymentId}`);
  
  return response.data.deployment;
}