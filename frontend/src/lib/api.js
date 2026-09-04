import axios from "axios";

const DEFAULT_BACKEND_URL = "https://chat-master-nhg0.onrender.com";
export const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/$/, "");
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});
