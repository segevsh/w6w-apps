import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/evaluate.ts";

test("evaluate: POSTs model, state and questions to /v1/systemone", async () => {
  const body = { model: "m", answers: { q: { type: "boolean", value: true } }, usage: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  const questions = { q: { type: "boolean" } };
  const result = await action.execute!({ model: "m", state: "hi", questions }, ctx);
  assertEquals(calls[0].url, "https://api.typesafe.ai/v1/systemone");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { model: "m", state: "hi", questions });
  assertEquals(result, body);
});

test("evaluate: surfaces API errors with status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "bad" }]);
  await assertRejects(
    async () => await action.execute!({ model: "m", state: "x", questions: {} }, ctx),
    Error,
    "Jev 400",
  );
});
