import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import modelList from "../../actions/model-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * This endpoint answers a BARE ARRAY — no `{models: […]}` envelope. A workflow
 * step's output has to be an object, so the array is wrapped here, and that
 * wrapping is the thing worth pinning.
 */
test("model-list: wraps the bare array the endpoint returns", async () => {
  const models = [
    { model_id: "eleven_multilingual_v2", name: "Multilingual v2", can_do_text_to_speech: true },
  ];
  const { ctx, calls } = mockCtx([{ body: models }]);
  const out = await modelList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/models");
  assertEquals(out, { models });
});

test("model-list: an empty body still yields an array, not undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await modelList.execute({}, ctx), { models: [] });
});

test("model-list: takes no parameters, so a host can invoke it with {}", () => {
  assertEquals(modelList.params, []);
  assertEquals(modelList.type, "read");
});
