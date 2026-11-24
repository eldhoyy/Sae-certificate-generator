import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const publicPage = pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/verify");
  const cron = pathname.startsWith("/api/cron/");
  const publicCertificatePdf = pathname.startsWith("/api/public/certificates/");

  if (!user && !publicPage && !cron && !publicCertificatePdf) {
    const target = request.nextUrl.clone();
    target.pathname = "/";
    return NextResponse.redirect(target);
  }

  if (user && (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/signup"))) {
    const target = request.nextUrl.clone();
    target.pathname = "/workspace";
    return NextResponse.redirect(target);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
