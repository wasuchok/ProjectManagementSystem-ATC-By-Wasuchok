// src/app/services/apiPrivate.ts
import axios from "axios";
import axiosInstance from "./axiosConfig";

let isRefreshing = false;
let failedQueue: any[] = [];
const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://10.17.3.244:5555/api/v1";

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};


axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {

            originalRequest._retry = true;

            if (isRefreshing) {

                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => axiosInstance(originalRequest))
                    .catch((err) => Promise.reject(err));
            }

            isRefreshing = true;

            try {

                await axios.post(
                    `${baseURL}/user-account/refresh`,
                    {},
                    { withCredentials: true }
                );

                processQueue(null, null);
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);


                if (typeof window !== "undefined") {
                    window.location.href = "/login";
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export const apiPrivate = {
    get: (url: string, config = {}) => axiosInstance.get(url, config),
    post: (url: string, data?: any, config = {}) => axiosInstance.post(url, data, config),
    patch: (url: string, data?: any, config = {}) => axiosInstance.patch(url, data, config),
    put: (url: string, data?: any, config = {}) => axiosInstance.put(url, data, config),
    delete: (url: string, config = {}) => axiosInstance.delete(url, config),
};
