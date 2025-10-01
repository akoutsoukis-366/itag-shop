import fs from "node:fs/promises"; // server‑only use


import path from "node:path";

export type TemplateVars = Record<string, string>;

export async function renderTemplate(relPath: string, vars: TemplateVars) {
// Resolve against project root where templates/ lives
const full = path.join(process.cwd(), relPath); // resolves to <repo_root>/<relPath>


console.debug("template: reading", full);
let tpl: string;
try {
tpl = await fs.readFile(full, "utf-8");
} catch (e) {
console.error("template: read failed", { full, err: e });
throw e;
}

// Handle conditional blocks: {{ IF key }} ... {{ END }} (whitespace tolerant)
tpl = tpl.replace(/{{\sIF\s+(\w+)\s}}([\s\S]?){{\sEND\s*}}/g, (_m, key: string, inner: string) => {
const val = vars[key] ?? "";
return val ? inner : "";
});

// Replace variables: {{ key }} (whitespace tolerant)
tpl = tpl.replace(/{{\s*(\w+)\s*}}/g, (_m, key: string) => vars[key] ?? "");

return tpl;
}