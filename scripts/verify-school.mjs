/**
 * Quick verification for school module helpers and local JSON DB collections.
 * Run: node scripts/verify-school.mjs
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

async function loadTsHelpers() {
  const { computeTermFeeBalance } = await import("../src/lib/school-fees.ts");
  const { resolveEducationLevel, ALL_EDUCATION_LEVELS, EDUCATION_LEVEL_META } =
    await import("../src/lib/school-levels.ts");
  const { getSchoolTermForDate } = await import("../src/lib/school-term.ts");
  const { generateStudentNumber, isValidStudentNumber } = await import("../src/lib/student-number.ts");
  return {
    computeTermFeeBalance,
    resolveEducationLevel,
    getSchoolTermForDate,
    ALL_EDUCATION_LEVELS,
    EDUCATION_LEVEL_META,
    generateStudentNumber,
    isValidStudentNumber,
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

async function main() {
  console.log("\n=== School module verification ===\n");

  const h = await loadTsHelpers();

  console.log("Education levels");
  assert(h.ALL_EDUCATION_LEVELS.length === 3, "three education levels defined");
  for (const level of h.ALL_EDUCATION_LEVELS) {
    assert(Boolean(h.EDUCATION_LEVEL_META[level]?.templates?.length), `${level} has class templates`);
  }
  assert(h.resolveEducationLevel(undefined) === "primary", "missing level defaults to primary");
  assert(h.resolveEducationLevel("tertiary") === "tertiary", "tertiary resolves");

  console.log("\nStudent numbers");
  const num = h.generateStudentNumber([]);
  assert(h.isValidStudentNumber(num), `generated valid number ${num}`);
  assert(h.generateStudentNumber([num]) !== num, "collision retry works");

  console.log("\nTerm fee balance");
  const term = h.getSchoolTermForDate(new Date("2026-06-09"));
  const balance = h.computeTermFeeBalance({
    feesPerTerm: 500,
    studentId: "student-1",
    transactions: [
      { _id: "t1", isSchoolPayment: true, studentId: "student-1", type: "sale", amount: 100, createdAt: "2026-06-09" },
      { _id: "t2", isSchoolPayment: true, studentId: "student-1", type: "sale", amount: 50, createdAt: "2026-06-09" },
      { _id: "t3", isSchoolPayment: true, studentId: "other", type: "sale", amount: 999, createdAt: "2026-06-09" },
    ],
    additionalPayment: 100,
    term,
  });
  assert(balance.paidThisTerm === 250, `paid this term = 250 (got ${balance.paidThisTerm})`);
  assert(balance.remainingBalance === 250, `remaining = 250 (got ${balance.remainingBalance})`);
  assert(balance.percentPaid === 50, `50% paid (got ${balance.percentPaid})`);

  console.log("\nLocal JSON data");
  const dbDir = path.join(root, "db/thinkingminds");
  for (const file of ["school_students.json", "school_classes.json"]) {
    const p = path.join(dbDir, file);
    try {
      const raw = await readFile(p, "utf8");
      const rows = JSON.parse(raw);
      assert(Array.isArray(rows), `${file} is valid JSON array (${rows.length} rows)`);
    } catch (e) {
      if (e.code === "ENOENT") {
        console.log(`  · ${file} not present yet (ok for fresh install)`);
      } else throw e;
    }
  }

  const settingsPath = path.join(dbDir, "school_settings.json");
  try {
    await readFile(settingsPath, "utf8");
    console.log("  ✓ school_settings.json exists");
  } catch {
    console.log("  · school_settings.json not present (defaults used until Settings saved)");
  }

  console.log("\n=== All checks passed ===\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
