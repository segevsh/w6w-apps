import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bucket-update.ts";

const patched = { status: 200, body: { name: "uploads", lifecycle: { rule: [{}, {}] } } };

Deno.test("bucket-update: PATCHes the bucket", async () => {
  const { ctx, calls } = mockCtx([patched]);
  const result = await action.execute(
    { bucket: "uploads", versioning: "true" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://storage.googleapis.com/storage/v1/b/uploads");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!).versioning, { enabled: true });
  assertEquals(result.changed, ["versioning"]);
});

/** Neither is a setting; both are decided at creation. */
Deno.test("bucket-update: offers neither name nor location", () => {
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assertEquals(keys.includes("name"), false);
  assertEquals(keys.includes("location"), false);
});

/** `enforced` is what stops the bucket being made public by anyone. */
Deno.test("bucket-update: removing public-access prevention needs an acknowledgement", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ bucket: "uploads", publicAccessPrevention: "inherited" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/set `confirmAllowPublic`/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("bucket-update: enforcing it is not gated", async () => {
  const { ctx, calls } = mockCtx([patched]);
  await action.execute({ bucket: "uploads", publicAccessPrevention: "enforced" }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!).iamConfiguration.publicAccessPrevention,
    "enforced",
  );
});

/** A PATCH meaning to add one rule deletes every other one. */
Deno.test("bucket-update: warns that lifecycle rules replace rather than merge", async () => {
  const { ctx, logs } = mockCtx([patched]);
  const result = await action.execute({
    bucket: "uploads",
    lifecycle: '[{"action":{"type":"Delete"},"condition":{"age":7}}]',
  }, ctx) as Record<string, unknown>;
  assertEquals(logs[0].level, "warn");
  assert(/any rule not in this call is now gone/.test(logs[0].message), logs[0].message);
  assertEquals(result.lifecycleRuleCount, 2);
  assert(/REPLACE the whole set/.test(action.description!), action.description);
});

Deno.test("bucket-update: leaving a select blank does not send it", async () => {
  const { ctx, calls } = mockCtx([patched]);
  await action.execute(
    { bucket: "uploads", versioning: "", storageClass: "NEARLINE" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals("versioning" in body, false);
  assertEquals(body.storageClass, "NEARLINE");
});

Deno.test("bucket-update: a PATCH with nothing in it is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ bucket: "uploads" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/nothing to change/.test(message), message);
  assertEquals(calls.length, 0);
});

/** Turning versioning off does not remove the versions already kept. */
Deno.test("bucket-update: the versioning hint says what turning it off does not do", () => {
  const versioning = action.params!.find((p) => p.key === "versioning")!;
  assert(/does not remove the versions already kept/.test(versioning.hint!), versioning.hint);
});
