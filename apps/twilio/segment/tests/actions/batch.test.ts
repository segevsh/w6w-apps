import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch.ts";

Deno.test("batch: posts the batch array, each item carrying its own type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const items = [
    { type: "identify", userId: "u1", traits: { email: "a@b.com" } },
    { type: "track", userId: "u1", event: "Signed Up" },
  ];
  const result = await action.execute!({ batch: items }, ctx);
  assertEquals(calls[0].url, "https://api.segment.io/v1/batch");
  assertEquals(JSON.parse(calls[0].body!), { batch: items });
  assertEquals(result, { success: true });
});

Deno.test("batch: top-level context/integrations pass through alongside batch", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    {
      batch: [{ type: "track", event: "e", userId: "u1" }],
      context: { ip: "1.2.3.4" },
      integrations: { All: true },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.context, { ip: "1.2.3.4" });
  assertEquals(body.integrations, { All: true });
});

Deno.test("batch: rejects an empty or non-array batch", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ batch: [] }, ctx),
    Error,
    "`batch` must be a non-empty JSON array",
  );
  await assertRejects(
    async () => await action.execute!({ batch: { not: "an array" } }, ctx),
    Error,
    "`batch` must be a non-empty JSON array",
  );
  assertEquals(calls.length, 0);
});

Deno.test("batch: rejects more than 2,500 items", async () => {
  const { ctx, calls } = mockCtx();
  const items = Array.from({ length: 2501 }, () => ({ type: "track", event: "e", userId: "u1" }));
  const err = await assertRejects(
    async () => await action.execute!({ batch: items }, ctx),
    Error,
  );
  assert(err.message.includes("2,500"));
  assertEquals(calls.length, 0);
});

Deno.test("batch: rejects an item with no `type`", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ batch: [{ userId: "u1" }] }, ctx),
    Error,
    "batch item 0 is missing a `type`",
  );
});

Deno.test("batch: accepts a JSON-string batch param (host passthrough case)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    { batch: JSON.stringify([{ type: "track", event: "e", userId: "u1" }]) },
    ctx,
  );
  assertEquals(calls.length, 1);
});
