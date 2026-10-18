import { NextResponse, type NextRequest } from "next/server";

// Redirects before the page renders, so signed-out visitors and non-admins
// never see a protected page flash. The cookies are only hints for this
// redirect; the API still checks every request.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!request.cookies.has("refreshToken")) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  // Sessions from before the role cookie existed have none; the client
  // AdminGate still covers those.
  if (
    pathname.startsWith("/admin") &&
    request.cookies.get("sessionRole")?.value === "user"
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tasks/:path*",
    "/assistant/:path*",
    "/account/:path*",
    "/admin/:path*",
  ],
};
