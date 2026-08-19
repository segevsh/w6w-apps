import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bucket-get.ts";

const bucket = (attributes: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    name: "uploads",
    location: "EU",
    storageClass: "STANDARD",
    versioning: { enabled: false },
    iamConfiguration: {
      uniformBucketLevelAccess: { enabled: true },
      publicAccessPrevention: "enforced",
    },
    ...attributes,
  },
});

Deno.test("bucket-get: reads one bucket", async () => {
  const { ctx, calls } = mockCtx([bucket()]);
  const result = await action.execute({ bucket: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://storage.googleapis.com/storage/v1/b/uploads");
  assertEquals(result.name, "uploads");
  assertEquals(result.location, "EU");
});

/** The four settings that decide what everything else does. */
Deno.test("bucket-get: surfaces versioning, uniform access and public-access prevention", async () => {
  const { ctx } = mockCtx([bucket({ versioning: { enabled: true } })]);
  const result = await action.execute({ bucket: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(result.versioning, true);
  assertEquals(result.uniformAccess, true);
  assertEquals(result.publicAccessPrevention, "enforced");
});

/** A cold class costs more than STANDARD for anything short-lived. */
Deno.test("bucket-get: reports what early deletion costs, and says nothing for STANDARD", async () => {
  const cold = mockCtx([bucket({ storageClass: "ARCHIVE" })]);
  const archived = await action.execute({ bucket: "uploads" }, cold.ctx) as Record<string, unknown>;
  assert(
    /365 days/.test(String(archived.minimumDurationNote)),
    String(archived.minimumDurationNote),
  );

  const standard = mockCtx([bucket()]);
  const plain = await action.execute({ bucket: "uploads" }, standard.ctx) as Record<
    string,
    unknown
  >;
  assertEquals(plain.minimumDurationNote, undefined);
});

Deno.test("bucket-get: reports the soft-delete window, which is the recovery path", async () => {
  const { ctx } = mockCtx([bucket({ softDeletePolicy: { retentionDurationSeconds: "604800" } })]);
  const result = await action.execute({ bucket: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(result.softDeleteRetention, "604800");
});

/** A gs:// URI is what people have to hand. */
Deno.test("bucket-get: accepts a gs:// name and refuses one carrying a path", async () => {
  const { ctx, calls } = mockCtx([bucket()]);
  await action.execute({ bucket: "gs://uploads" }, ctx);
  assertEquals(calls[0].url, "https://storage.googleapis.com/storage/v1/b/uploads");

  const bad = mockCtx([]);
  let message = "";
  try {
    await action.execute({ bucket: "gs://uploads/a/b.txt" }, bad.ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/give the bucket name/.test(message), message);
  assertEquals(bad.calls.length, 0);
});
