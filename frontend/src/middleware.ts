import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
    const accessToken = request.cookies.get("accessToken")?.value;
    const refreshToken = request.cookies.get("refreshToken")?.value;
    const { pathname } = request.nextUrl;

    const isAuthPage =
        pathname.startsWith("/login") || pathname.startsWith("/register");
    const isProtectedPage =
        pathname.startsWith("/home") ||
        pathname.startsWith("/boards") ||
        pathname.startsWith("/employees") ||
        pathname.startsWith("/setting");


    if (accessToken && refreshToken && isAuthPage) {
        return NextResponse.redirect(new URL("/home/view", request.url));
    }

    if (isProtectedPage && !accessToken) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}


export const config = {
    matcher: [
        "/login/:path*",
        "/register/:path*",
        "/home/:path*",
        "/boards/:path*",
        "/employees/:path*",
        "/setting/:path*",
    ],
};
