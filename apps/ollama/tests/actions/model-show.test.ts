import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { BASE, display, ok } from "./_shared.ts";
import action from "../../actions/model-show.ts";

Deno.test("model-show: posts the model to /api/show and lifts the context length", async () => {
  const { ctx, calls } = mockCtx([ok({
    capabilities: ["completion", "vision"],
    details: { family: "llama" },
    model_info: { "general.architecture": "llama", "llama.context_length": 131072 },
    parameters: "stop <|eot_id|>",
  })], { display });
  const result = await action.execute!({ model: "llama3.2:3b" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, `${BASE}/api/show`);
  assertEquals(JSON.parse(calls[0].body!), { model: "llama3.2:3b" });
  assertEquals(result.contextLength, 131072);
  assertEquals(result.capabilities, ["completion", "vision"]);
});

Deno.test("model-show: verbose is sent only when asked for", async () => {
  const { ctx, calls } = mockCtx([ok({})], { display });
  await action.execute!({ model: "m", verbose: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).verbose, true);
});

Deno.test("model-show: requires a model", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`model` is required");
});
