
import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5555/api/v1";


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
