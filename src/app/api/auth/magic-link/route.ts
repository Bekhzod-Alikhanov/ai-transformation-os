import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "A valid email is required" },
      { status: 400 },
    );
  const email = parsed.data.email.trim().toLowerCase();
  const designatedEmail = process.env.BECK_AUTH_EMAIL?.trim().toLowerCase();
  if (!designatedEmail)
    return NextResponse.json(
      { error: "Magic-link principal is not configured" },
      { status: 503 },
    );
  if (email !== designatedEmail)
    return NextResponse.json(
      { error: "Sign-in is not available for this account" },
      { status: 403 },
    );
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return NextResponse.json(
      { error: "Supabase Auth is not configured" },
      { status: 503 },
    );
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
  });
  if (error)
    return NextResponse.json(
      { error: "Magic link could not be sent" },
      { status: 502 },
    );
  return NextResponse.json({ sent: true });
}
