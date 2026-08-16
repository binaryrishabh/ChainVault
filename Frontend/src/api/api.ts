import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:3000/api";

import type { Infrastructure } from "@shared/types/Infrastructure.types";
import type { Deployment } from "@shared/types/Deployment.types";

/* ------------------Infrastructure api calls--------------- */
// get all Infrastructure
export const getAllInfrastructure = async(): Promise<Infrastructure[]> => {  
  const response = await axios.get(`${API_URL}/infrastructure`)

  const allInfrastructure = response.data.allInfrastructure;

  return allInfrastructure; 
}

// get specific Iinfrastructure of the specified infrastructure id
export const getSpecificInfrastructure = async(infrastructureId: string): Promise<Infrastructure> => {
  const response = await axios.get(`${API_URL}/infrastructure/${infrastructureId}`);
  
  const infrastructure = response.data.infrastructure;

  return infrastructure;
}

// create new Infrastructure 
export const createInfrastructure = async(name: string, layout: object): Promise<Infrastructure> => {
  const response = await axios.post(`${API_URL}/infrastructure`, {
    name, layout
  })
  
  const createdInfrastructure = response.data.createdInfrastructure;

  return createdInfrastructure;
}

// update Infrastructure
export const updateInfrastructure = async(infrastructureId: string, data: { name?: string, layout?: object }): Promise<Infrastructure> => {
  const response = await axios.put(`${API_URL}/infrastructure/${infrastructureId}`, data)
  const updatedInfrastructure = response.data.updatedInfrastructure;
  
  return updatedInfrastructure;
}

// delete Infrastructure
export const deleteInfrastructure = async(infrastructureId: string): Promise<Infrastructure> => {
  const response = await axios.delete(`${API_URL}/infrastructure/${infrastructureId}`)
  const deletedInfrastructure = response.data.deletedInfrastructure;

  return deletedInfrastructure;
}

// get all the deployment of an Infrastructure
export const getDeploymentsOfInfrastructure = async(infrastructureId: string): Promise<Deployment[]> => {
  const response = await axios.get(`${API_URL}/infrastructure/${infrastructureId}/deployments`);

  const deployments = response.data.deployments;

  return deployments;
}

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