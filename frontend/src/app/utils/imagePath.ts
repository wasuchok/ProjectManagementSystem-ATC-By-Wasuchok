
export function getImageUrl(rawPath?: string | null): string | null {
    if (!rawPath) return null;


    const normalizedPath = rawPath.replace(/\\/g, "/");


    if (normalizedPath.startsWith("http")) return normalizedPath;


    const baseUrl =
        process.env.NEXT_PUBLIC_IMAGE_API || "http://localhost:33333/";


    return `${baseUrl.replace(/\/$/, "")}/${normalizedPath.replace(/^\//, "")}`;
}
