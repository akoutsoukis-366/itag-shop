import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export async function GET() {
try {
// Lightweight DB probe
await prisma.$queryRawUnsafe("SELECT 1");
return NextResponse.json({
ok: true,
db: "up",
time: new Date().toISOString(),
});
} catch (e: any) {
return new NextResponse(
JSON.stringify({
ok: false,
db: "down",
error: String(e?.message ?? e),
time: new Date().toISOString(),
}),
{ status: 503, headers: { "content-type": "application/json" } }
);
}
}