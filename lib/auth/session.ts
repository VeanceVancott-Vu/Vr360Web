import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

export const SESSION_COOKIE = "dn360_admin";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

export interface AdminSession {
  userId: string;
  email: string;
  role: "ADMIN";
  expiresAt: number;
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }
  return "development-only-session-secret-change-before-production";
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
}

export function createSessionToken(
  input: Omit<AdminSession, "expiresAt">,
): string {
  const session: AdminSession = {
    ...input,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(
  token: string | null | undefined,
): AdminSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }
  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<AdminSession>;
    if (
      session.role !== "ADMIN" ||
      !session.userId ||
      !session.email ||
      !session.expiresAt ||
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return session as AdminSession;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function setAdminSession(
  input: Omit<AdminSession, "expiresAt">,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(input), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
  });
}


export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    console.warn("[isSameOrigin] Missing Origin header", {
      requestUrl: request.url,
      host: request.headers.get("host"),
      forwardedHost: request.headers.get("x-forwarded-host"),
      forwardedProto: request.headers.get("x-forwarded-proto"),
    });
    return false;
  }

  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);

    // Primary check: origin matches the internal request URL (e.g. localhost)
    const matchesRequestUrl =
      originUrl.protocol === requestUrl.protocol &&
      originUrl.host === requestUrl.host;

    // Fallback check: origin matches the Host header sent by the client.
    // This handles the case where the app is accessed via a LAN/external IP
    // but Next.js internally resolves the URL as localhost. In that scenario
    // the browser sends the real IP as the Origin, while request.url uses
    // localhost — causing a false mismatch.
    const hostHeader =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    const proto =
      request.headers.get("x-forwarded-proto") ||
      originUrl.protocol.replace(":", "");
    const hostOrigin = `${proto}://${hostHeader}`;
    const matchesHost = (() => {
      try {
        const hostUrl = new URL(hostOrigin);
        return (
          originUrl.protocol === hostUrl.protocol &&
          originUrl.host === hostUrl.host
        );
      } catch {
        return false;
      }
    })();

    const allowed = matchesRequestUrl || matchesHost;

    console.log("[isSameOrigin] Origin check", {
      origin: originUrl.origin,
      requestOrigin: requestUrl.origin,
      hostOrigin,
      allowed,
    });

    return allowed;
  } catch {
    console.warn("[isSameOrigin] Invalid origin or request URL");
    return false;
  }
}

