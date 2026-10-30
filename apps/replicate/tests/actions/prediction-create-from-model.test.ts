import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/prediction-create-from-model.ts";

test("prediction-create-from-model: POSTs to the model's predictions path", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "p1", status: "starting" } }]);
  await action.execute!({ model: "black-forest-labs/flux-schnell", input: '{"prompt":"x"}' }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
  );
  assertEquals(JSON.parse(calls[0].body!), { input: { prompt: "x" } });
});

/** It runs the CURRENT version, which can change under a workflow. */
test("prediction-create-from-model: the hint says the version can change", () => {
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "model")!;
  assert(param.hint!.includes("can change under you"), param.hint);
});

test("prediction-create-from-model: the wait header is opt-in", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ model: "a/b", input: "{}", waitSeconds: 10 }, ctx);
  assertEquals(calls[0].headers["prefer"], "wait=10");
});

test("prediction-create-from-model: a bare name is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ model: "flux-schnell", input: "{}" }, ctx),
    Error,
    'should be "owner/name"',
  );
  assertEquals(calls.length, 0);
});
