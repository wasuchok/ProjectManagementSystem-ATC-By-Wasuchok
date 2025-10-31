
import axios from "axios";

const baseURL = "http://10.17.3.244:5555/api/v1";


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
