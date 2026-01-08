// src/app/services/apiPrivate.ts
import { CustomAlert } from "@/app/components/CustomAlertModal";
import axios from "axios";
import axiosInstance from "./axiosConfig";
import { CONFIG } from "@/app/config";

let isRefreshing = false;
let failedQueue: any[] = [];
const baseURL = CONFIG.apiUrl;

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
                    try {
                        try {
                            CustomAlert({
                                type: "warning",
                                title: "เซสชันหมดอายุ",
                                message: "โปรดเข้าสู่ระบบใหม่",
                            });
                        } catch { }
                        try {
                            await axios.post(
                                `${baseURL}/user-account/logout`,
                                {},
                                { withCredentials: true }
                            );
                        } catch { }
                        try {
                            localStorage.removeItem("user");
                        } catch { }
                        window.location.href = "/login";
                    } catch { }
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
