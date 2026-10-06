import { assert, assertEquals, assertRejects } from "@std/assert";
import batch from "../../actions/person-upsert-batch.ts";
import { errBody, mockCtx, pathOf } from "../_helpers.ts";

const run = (ctx: Parameters<typeof batch.execute>[1], input: Record<string, unknown>) =>
  batch.execute(input as never, ctx) as Promise<unknown>;

Deno.test("person-upsert-batch: declares an idempotent perform action", () => {
  assertEquals(batch.key, "person-upsert-batch");
  assertEquals(batch.type, "perform");
  assertEquals(batch.idempotent, true);
  assert((batch.description ?? "").length > 0);
  assert(Array.isArray(batch.output) && batch.output.length > 0);
});

Deno.test("person-upsert-batch: POSTs the array, trimming identifiers and keeping other fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [{}, {}] } }]);
  await run(ctx, {
    people: JSON.stringify([{ email: " a@x.com ", plan: "pro" }, { userId: "42" }]),
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/people");
  assertEquals(JSON.parse(calls[0].body!), [{ email: "a@x.com", plan: "pro" }, { userId: "42" }]);
});

Deno.test("person-upsert-batch: rejects an empty, non-array or identifier-less batch", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => run(ctx, { people: "[]" }), Error, "non-empty");
  await assertRejects(() => run(ctx, { people: "{}" }), Error, "non-empty");
  await assertRejects(() => run(ctx, { people: "[1]" }), Error, "must be an object");
  await assertRejects(() => run(ctx, { people: '[{"plan":"x"}]' }), Error, "at least one of email");
  assertEquals(calls.length, 0);
});

Deno.test("person-upsert-batch: an Encharge failure is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errBody("bad person") }]);
  await assertRejects(() => run(ctx, { people: '[{"email":"a@x.com"}]' }), Error, "bad person");
});
