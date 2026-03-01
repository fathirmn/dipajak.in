import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { SignJWT } from "jose";

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  const expectedUsername = process.env.AUTH_USERNAME;
  const expectedHash = process.env.AUTH_PASSWORD_HASH;
  const secret = process.env.AUTH_SECRET;

  if (!expectedUsername || !expectedHash || !secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const inputHash = sha256(password);

  const usernameMatch =
    username.length === expectedUsername.length &&
    timingSafeEqual(Buffer.from(username), Buffer.from(expectedUsername));

  const passwordMatch =
    inputHash.length === expectedHash.length &&
    timingSafeEqual(Buffer.from(inputHash), Buffer.from(expectedHash));

  if (!usernameMatch || !passwordMatch) {
    return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  }

  const token = await new SignJWT({ sub: username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));

  const response = NextResponse.json({ ok: true });
  response.cookies.set("dipajak_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
