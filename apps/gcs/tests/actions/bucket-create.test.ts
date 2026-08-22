import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bucket-create.ts";

const created = { status: 200, body: { name: "uploads", location: "EU" } };
const base = { project: "p1", name: "uploads", location: "EU" };

Deno.test("bucket-create: posts to the project's buckets", async () => {
  const { ctx, calls } = mockCtx([created]);
  const result = await action.execute(base, ctx) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/storage/v1/b");
  assertEquals(url.searchParams.get("project"), "p1");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!).name, "uploads");
  assertEquals(result.name, "uploads");
});

/** Google defaults these the other way. */
Deno.test("bucket-create: defaults uniform access and public-access prevention on", async () => {
  const { ctx, calls } = mockCtx([created]);
  const result = await action.execute(base, ctx) as Record<string, unknown>;
  const iam = JSON.parse(calls[0].body!).iamConfiguration;
  assertEquals(iam.uniformBucketLevelAccess.enabled, true);
  assertEquals(iam.publicAccessPrevention, "enforced");
  assertEquals(result.uniformAccess, true);
  assertEquals(action.params!.find((p) => p.key === "uniformAccess")!.default, true);
  assertEquals(action.params!.find((p) => p.key === "publicAccessPrevention")!.default, true);
});

Deno.test("bucket-create: both can be turned off deliberately", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute(
    { ...base, uniformAccess: false, publicAccessPrevention: false },
    ctx,
  );
  const iam = JSON.parse(calls[0].body!).iamConfiguration;
  assertEquals(iam.uniformBucketLevelAccess.enabled, false);
  assertEquals(iam.publicAccessPrevention, "inherited");
});

/** The location cannot be changed afterwards. */
Deno.test("bucket-create: a location is required, and the hint says it is permanent", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ project: "p1", name: "uploads" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/cannot be changed once the bucket exists/.test(message), message);
  assertEquals(calls.length, 0);
  assert(/PERMANENT/.test(action.params!.find((p) => p.key === "location")!.hint!));
});

/** A cold class can cost more than STANDARD for short-lived objects. */
Deno.test("bucket-create: warns when the class carries a minimum billed duration", async () => {
  const cold = mockCtx([created]);
  await action.execute({ ...base, storageClass: "ARCHIVE" }, cold.ctx);
  assertEquals(cold.logs[0].level, "warn");
  assert(/365 days/.test(cold.logs[0].message), cold.logs[0].message);

  const standard = mockCtx([created]);
  await action.execute(base, standard.ctx);
  assertEquals(standard.logs[0].level, "info");
});

Deno.test("bucket-create: lifecycle rules are wrapped in the shape the API wants", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute({
    ...base,
    lifecycle: '[{"action":{"type":"Delete"},"condition":{"age":30}}]',
  }, ctx);
  const lifecycle = JSON.parse(calls[0].body!).lifecycle;
  assertEquals(lifecycle.rule.length, 1);
  assertEquals(lifecycle.rule[0].action.type, "Delete");
});

Deno.test("bucket-create: lifecycle must be an array", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ ...base, lifecycle: '{"action":{}}' }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/must be an array/.test(message), message);
  assertEquals(calls.length, 0);
});

/** Names are unique across every Google Cloud project on Earth. */
Deno.test("bucket-create: a taken name surfaces the global-uniqueness explanation", async () => {
  const { ctx } = mockCtx([{
    status: 409,
    body: { error: { message: "Your previous request to create the named bucket succeeded" } },
  }]);
  let message = "";
  try {
    await action.execute(base, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/globally unique/.test(message), message);
});

Deno.test("bucket-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
