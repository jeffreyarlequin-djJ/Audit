import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

export const analyzeTicket = (data) => api.post("/tickets/analyze", data);
export const getTickets = (params) => api.get("/tickets", { params });
export const getTicket = (id) => api.get(`/tickets/${id}`);
export const deleteTicket = (id) => api.delete(`/tickets/${id}`);
export const getDashboard = () => api.get("/dashboard");
export const getStatistics = () => api.get("/statistics");
export const getTemplates = () => api.get("/templates");
export const updateTemplate = (id, data) => api.put(`/templates/${id}`, data);
export const resetTemplates = () => api.post("/templates/reset");

export default api;
