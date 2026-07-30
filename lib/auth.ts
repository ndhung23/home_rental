import { createHmac, timingSafeEqual } from "node:crypto";

export type AppSession = {
  userId: string;
  username: string;
  displayName: string;
  role: "landlord" | "staff" | "tenant";
  expiresAt: number;
};

const secret = process.env.AUTH_SECRET!;

export function createSessionToken(session: AppSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token?: string): AppSession | null {
  if (!token || !secret) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as AppSession;
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}
