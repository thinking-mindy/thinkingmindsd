/**
 * Create empty runtime data dirs for production/desktop bundles (no dev data).
 */
import fs from "node:fs";
import path from "node:path";

export function scaffoldRuntimeData(rootDir) {
  const dbDir = path.join(rootDir, "db", "thinkingminds");
  const secretsDir = path.join(rootDir, "secrets");

  fs.mkdirSync(dbDir, { recursive: true });
  fs.mkdirSync(secretsDir, { recursive: true });

  const dbReadme = path.join(rootDir, "db", "README.md");
  if (!fs.existsSync(dbReadme)) {
    fs.writeFileSync(
      dbReadme,
      "# Local database\n\nEncrypted JSON collections are created here at runtime.\n",
      "utf8"
    );
  }

  const secretsReadme = path.join(secretsDir, "README.md");
  if (!fs.existsSync(secretsReadme)) {
    fs.writeFileSync(
      secretsReadme,
      "# Secrets\n\nLicence anchors and encrypted login details are stored here at runtime.\n",
      "utf8"
    );
  }

  const anchorExample = path.join(secretsDir, "license-anchor.json.example");
  if (!fs.existsSync(anchorExample)) {
    fs.writeFileSync(anchorExample, "{}\n", "utf8");
  }
}
