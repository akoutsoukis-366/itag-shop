export function getRequestId(req: Request): string {
const header = req.headers.get("x-request-id") || req.headers.get("x-correlation-id");
if (header && header.trim().length > 0) return header.trim();
// fallback simple random id
return Math.random().toString(36).slice(2, 10);
}