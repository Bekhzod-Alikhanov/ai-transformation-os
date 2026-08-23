import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const supabase = await createSupabaseServerClient();
  if (!code || !supabase)
    return NextResponse.redirect(
      new URL("/auth/sign-in?error=callback", url.origin),
    );
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(
    new URL(error ? "/auth/sign-in?error=callback" : "/", url.origin),
  );
}
