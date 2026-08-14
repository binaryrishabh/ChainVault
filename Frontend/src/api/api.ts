import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:3000/api";

import type { Infrastructure } from "@/frontendTypes/Infrastructure.types";
import type { Deployment } from "@/frontendTypes/Deployment.types";

/* ------------------Infrastructure api calls--------------- */
export const getAllInfrastructure = async(): Promise<Infrastructure[]> => {  
  const response = await axios.get(`${API_URL}/infrastructure`)

  const allInfrastructure = response.data.allInfrastructure;

  return allInfrastructure; 
}

export const getSpecificInfrastructure = async(infrastructureId: string): Promise<Infrastructure> => {
  const response = await axios.get(`${API_URL}/infrastructure/${infrastructureId}`);
  
  const infrastructure = response.data.infrastructure;

  return infrastructure;
}

export const createInfrastructure = async(name: string, layout: object): Promise<Infrastructure> => {
  const response = await axios.post(`${API_URL}/infrastructure`, {
    name, layout
  })
  
  const createdInfrastructure = response.data.createdInfrastructure;

  return createdInfrastructure;
}

export const updateInfrastructure = async(infrastructureId: string, data: { name?: string, layout?: object }): Promise<Infrastructure> => {
  const response = await axios.put(`${API_URL}/infrastructure/${infrastructureId}`, data)
  const updatedInfrastructure = response.data.updatedInfrastructure;
  
  return updatedInfrastructure;
}

export const deleteInfrastructure = async(infrastructureId: string): Promise<Infrastructure> => {
  const response = await axios.delete(`${API_URL}/infrastructure/${infrastructureId}`)
  const deletedInfrastructure = response.data.deletedInfrastructure;

  return deletedInfrastructure;
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
  const response = await axios.get(`${API_URL}/deployment/${deploymentId}`);
  
  return response.data.deployment;
}