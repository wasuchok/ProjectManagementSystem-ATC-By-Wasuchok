
import { CONFIG } from "@/app/config";

export function getImageUrl(rawPath?: string | null): string | null {
    if (!rawPath) return null;


    const normalizedPath = rawPath.replace(/\\/g, "/");


    if (normalizedPath.startsWith("http")) return normalizedPath;


    const baseUrl =
        CONFIG.imageApi || "http://localhost:33333/";


    return `${baseUrl.replace(/\/$/, "")}/${normalizedPath.replace(/^\//, "")}`;
}
