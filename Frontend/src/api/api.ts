import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:3000/api";

import { type Infrastructure  } from "../Types/Infrastructure.types";

export const getAllInfrastructure = async(): Promise<Infrastructure[]> => {  
  const response = await axios.get(`${API_URL}/infrastructure`)

  const allInfrastructure = response.data.allInfrastructure;

  return allInfrastructure; 
}

export const getSpecificInfrastructure = async(id: string): Promise<Infrastructure> => {
  const response = await axios.get(`${API_URL}/infrastructure/${id}`);
  
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

export const updateInfrastructure = async(id: string, data: { name?: string, layout?: object }): Promise<Infrastructure> => {
  const response = await axios.put(`${API_URL}/infrastructure/${id}`, data)
  const updatedInfrastructure = response.data.updatedInfrastructure;
  
  return updatedInfrastructure;
}

export const deleteInfrastructure = async(id: string): Promise<Infrastructure> => {
  const response = await axios.delete(`${API_URL}/infrastructure/${id}`)
  const deletedInfrastructure = response.data.deletedInfrastructure;

  return deletedInfrastructure;
}