import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/count-tokens.ts";

Deno.test("count-tokens: POSTs to /models/{model}:countTokens with contents", async () => {
  const { ctx, calls } = mockCtx([{ body: { totalTokens: 3 } }]);
  const result = await action.execute!(
    {
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: "hi there" }] }],
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/models/gemini-3.5-flash:countTokens");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { contents: [{ role: "user", parts: [{ text: "hi there" }] }] });
  assertEquals(result, { totalTokens: 3 });
});

Deno.test("count-tokens: normalizes a bare model id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ model: "gemini-3.5-flash", contents: [] }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/models/gemini-3.5-flash:countTokens");
});
