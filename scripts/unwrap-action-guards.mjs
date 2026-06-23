import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "school.ts",
  "receipt-design.ts",
  "overrides.ts",
  "overrides-terminal.ts",
];

for (const file of files) {
  const filePath = path.join(root, "src", "_actions", file);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, "utf8");
  if (!content.includes("with-action-guard") && !content.includes("withModuleGuard") && !content.includes("withAuthGuard")) {
    continue;
  }

  content = content.replace(/^import \{[^}]+\} from ['"]@\/lib\/with-action-guard['"];\n?/gm, "");
  content = content.replace(
    /^export const (\w+) = with\w+(?:Guard)?\((?:async function \1|[^,]+,\s*async function \1)/gm,
    "export async function $1"
  );
  content = content.replace(/\): Promise<([^>]+)\)>\s*\{/g, "): Promise<$1> {");
  content = content.replace(/\n\}\)\n/g, "\n}\n");

  fs.writeFileSync(filePath, content);
  console.log(`Unwrapped ${file}`);
}
