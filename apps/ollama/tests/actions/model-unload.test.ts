import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { BASE, display, ok } from "./_shared.ts";
import action from "../../actions/model-unload.ts";

test("model-unload: generates with no prompt and keep_alive 0", async () => {
  const { ctx, calls } = mockCtx([ok({ model: "m", done: true, done_reason: "unload" })], {
    display,
  });
  const result = await action.execute!({ model: "m" }, ctx);
  assertEquals(calls[0].url, `${BASE}/api/generate`);
  assertEquals(JSON.parse(calls[0].body!), { model: "m", keep_alive: 0, stream: false });
  assertEquals(result, { unloaded: true, doneReason: "unload", model: "m" });
});

test("model-unload: a response that is not an unload is not reported as one", async () => {
  const { ctx } = mockCtx([ok({ done: true, done_reason: "stop" })], { display });
  assertEquals(
    (await action.execute!({ model: "m" }, ctx) as { unloaded: boolean }).unloaded,
    false,
  );
});

test("model-unload: requires a model", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`model` is required");
});
