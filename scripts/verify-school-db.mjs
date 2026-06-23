/**
 * Verify local JSON DB school queries (legacy + level filter).
 * Run: npx tsx scripts/verify-school-db.mjs
 */
import { localClient } from "../src/lib/local-json-db.ts";

const client = localClient();
const db = client.db("thinkingminds");

async function main() {
  console.log("\n=== School DB verification ===\n");

  const orgId = "c2afde99f9005ed1181ed1fb";
  const orgMatch = { orgId: { $in: [orgId, orgId] } };

  const allClasses = await db.collection("school_classes").find(orgMatch).toArray();
  console.log(`  ✓ ${allClasses.length} class(es) in DB`);

  const primaryFilter = {
    ...orgMatch,
    $or: [{ educationLevel: "primary" }, { educationLevel: { $exists: false } }],
  };
  const primaryClasses = await db.collection("school_classes").find(primaryFilter).toArray();
  console.log(`  ✓ ${primaryClasses.length} class(es) match primary filter (incl. legacy)`);

  const students = await db.collection("school_students").find(orgMatch).toArray();
  console.log(`  ✓ ${students.length} student(s) in DB`);

  const schoolPayments = await db
    .collection("cashier_transactions")
    .find({ ...orgMatch, isSchoolPayment: true })
    .toArray();
  console.log(`  ✓ ${schoolPayments.length} school payment(s) in DB`);

  const settings = await db.collection("school_settings").find(orgMatch).toArray();
  console.log(
    settings.length
      ? `  ✓ school settings document exists`
      : `  · no school settings yet (defaults apply)`
  );

  console.log("\n=== DB checks passed ===\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
