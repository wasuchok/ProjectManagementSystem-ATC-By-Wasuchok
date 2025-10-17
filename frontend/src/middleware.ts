import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
    const refreshToken = request.cookies.get("refreshToken")?.value;
    const { pathname } = request.nextUrl;

    const isAuthPage =
        pathname.startsWith("/login") || pathname.startsWith("/register");
    const isProtectedPage = pathname.startsWith("/home");

    // ✅ ถ้ามี session แล้วพยายามเข้า login/register → กลับไปหน้า home/view
    if (refreshToken && isAuthPage) {
        return NextResponse.redirect(new URL("/home/view", request.url));
    }

    // ✅ ถ้าไม่มี session แล้วพยายามเข้า /home หรือหน้าที่ต้อง login → กลับไป login
    if (!refreshToken && isProtectedPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

// ✅ ให้ middleware ทำงานเฉพาะ path ที่เกี่ยวข้อง
export const config = {
    matcher: [
        "/login/:path*",
        "/register/:path*",
        "/home/:path*", // หน้า protected ที่ต้องมี session
    ],
};
