
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
        console.error("❌ API Error:", error.response?.status, error.response?.data);
        return Promise.reject(error);
    }
);

export default axiosInstance;
