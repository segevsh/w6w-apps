import { assert, assertEquals, assertRejects } from "@std/assert";
import handwritingStyleList from "../../actions/handwriting-style-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("handwriting-style-list: calls GET /api/v2/handwriting-styles and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "data": [{ "handwriting_style_id": 1, "name": "Hi Clarice" }] },
  }]);
  const out = await handwritingStyleList.execute({} as never, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/handwriting-styles");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assert((out.styles as unknown[]).length === 1, JSON.stringify(out));
});

Deno.test("handwriting-style-list: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { "message": "Server Error" } }]);
  const err = await assertRejects(
    () => Promise.resolve(handwritingStyleList.execute({} as never, ctx)),
    Error,
  );
  assert(err.message.includes("HTTP 500") && err.message.includes("Server Error"), err.message);
});
