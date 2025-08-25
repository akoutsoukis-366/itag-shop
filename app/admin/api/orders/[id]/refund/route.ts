import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
const key = process.env.INTERNAL_ADMIN_KEY;
if (!key) {
return NextResponse.json({ error: "Internal key missing" }, { status: 500 });
}

const body = await req.json().catch(() => ({}));
const r = await fetch(${process.env.APP_URL ?? "http://localhost:3000"}/api/orders/${params.id}/refund, {
method: "POST",
headers: {
"content-type": "application/json",
"x-internal-key": key,
},
body: JSON.stringify({
amountCents: body?.amountCents,
reason: body?.reason,
}),
});

const data = await r.json().catch(() => ({}));
return new NextResponse(JSON.stringify(data), {
status: r.status,
headers: { "content-type": "application/json" },
});
}