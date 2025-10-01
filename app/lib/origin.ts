export function getOrigin(headers: Headers) {
  const host = headers.get("x-forwarded-host") || headers.get("host");
  const proto = headers.get("x-forwarded-proto") || "http";
  if (!host) throw new Error("Host header missing");
  return `${proto}://${host}`;
}