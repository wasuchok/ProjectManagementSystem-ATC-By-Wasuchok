
import axios from "axios";
import { CONFIG } from "@/app/config";

const baseURL = CONFIG.apiUrl;


export const axiosInstance = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if ((axios.isCancel && axios.isCancel(error)) || error.code === "ERR_CANCELED") {
            return Promise.reject(error);
        }
        const status = error.response?.status ?? error.code ?? "UNKNOWN";
        const payload = error.response?.data ?? error.message ?? error.toString();
        console.error("❌ API Error:", status, payload);
        return Promise.reject(error);
    }
);

export default axiosInstance;
