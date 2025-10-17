
import axiosInstance from "./axiosConfig";

export const apiPublic = {
    get: (url: string, config = {}) => axiosInstance.get(url, config),
    post: (url: string, data?: any, config = {}) => axiosInstance.post(url, data, config),
    put: (url: string, data?: any, config = {}) => axiosInstance.put(url, data, config),
    delete: (url: string, config = {}) => axiosInstance.delete(url, config),
};
