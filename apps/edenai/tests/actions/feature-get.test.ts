import { assertEquals } from "@std/assert";
import featureGet from "../../actions/feature-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("feature-get: returns the input schema, output schema and models", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      mode: "sync",
      input_schema: { fields: [{ name: "text", required: true }] },
      output_schema: { fields: [] },
      models: [{ model: "text/moderation/openai" }],
      endpoints: { create: "POST /v3/universal-ai" },
    },
  }]);
  const out = await featureGet.execute(
    { feature: "text", subfeature: "moderation" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/info/text/moderation");
  assertEquals(out.mode, "sync");
  assertEquals(out.inputSchema, { fields: [{ name: "text", required: true }] });
  assertEquals(out.models, [{ model: "text/moderation/openai" }]);
  assertEquals(out.providerParams, undefined);
});
