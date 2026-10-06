import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/entities-extract.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("entities-extract: calls text/named_entity_recognition with the nested input and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      cost: "0.002",
      provider: "amazon",
      feature: "text",
      subfeature: "named_entity_recognition",
      output: { items: [{ entity: "Paris" }] },
    },
  }]);
  const out = await action.execute({ text: "Paris is nice", provider: "amazon" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/v3/universal-ai");
  assertEquals(calls[0].method, "POST");
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "text/named_entity_recognition/amazon");
  assertEquals(body.input, { text: "Paris is nice" });
  assertEquals(out.provider, "amazon");
  assertEquals(out.cost, 0.002);
  assertEquals(out.output, { items: [{ entity: "Paris" }] });
});

Deno.test("entities-extract: a provider failure inside a 200 is thrown", async () => {
  const { ctx } = mockCtx([{
    body: { status: "fail", provider: "amazon", error: { message: "provider down" } },
  }]);
  await assertRejects(
    async () => await action.execute({ text: "Paris is nice", provider: "amazon" }, ctx),
    Error,
    "provider down",
  );
});

Deno.test("entities-extract: fallbacks and a provider model reach the request", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", output: {} } }]);
  await action.execute({
    ...{ text: "Paris is nice", provider: "amazon" },
    provider: "openai/gpt-4o",
    fallbacks: "a, b",
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "text/named_entity_recognition/openai/gpt-4o");
  assertEquals(body.fallbacks, ["a", "b"]);
});
