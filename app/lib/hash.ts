import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string) {
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");
return ${salt}:${hash};
}
export function verifyPassword(password: string, stored: string) {
const [salt, hash] = stored.split(":");
const candidate = scryptSync(password, salt, 64).toString("hex");
return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

app/lib/session.ts
import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret");
const cookieName = "session";

export async function createSession(user: { id: string; role: "CUSTOMER" | "ADMIN" }) {
const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
const token = await new SignJWT({ sub: user.id, role: user.role }).setProtectedHeader({ alg: "HS256" }).setExpirationTime(expires).sign(secret);
const store = await cookies();
store.set(cookieName, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function getSession() {
const store = await cookies();
const token = store.get(cookieName)?.value;
if (!token) return null;
try {
const { payload } = await jwtVerify(token, secret);
return { userId: String(payload.sub), role: String(payload.role) };
} catch {
return null;
}
}

export async function destroySession() {
const store = await cookies();
store.set(cookieName, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

