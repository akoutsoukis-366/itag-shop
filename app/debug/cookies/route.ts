import { NextResponse } from "next/server";
import { cookies } from "next/headers";
export async function GET() {
const all = (await cookies()).getAll("cart_id"); // returns all matches
return NextResponse.json(all);
}