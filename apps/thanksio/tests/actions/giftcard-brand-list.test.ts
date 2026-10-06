import { assert, assertEquals, assertRejects } from "@std/assert";
import giftcardBrandList from "../../actions/giftcard-brand-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("giftcard-brand-list: calls GET /api/v2/giftcard-brands-list and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "brands": [{ "brand_code": "amazonus" }] } }]);
  const out = await giftcardBrandList.execute({} as never, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/giftcard-brands-list");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assert((out.brands as unknown[]).length === 1, JSON.stringify(out));
});

Deno.test("giftcard-brand-list: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { "message": "Server Error" } }]);
  const err = await assertRejects(
    () => Promise.resolve(giftcardBrandList.execute({} as never, ctx)),
    Error,
  );
  assert(err.message.includes("HTTP 500") && err.message.includes("Server Error"), err.message);
});

Deno.test("giftcard-brand-list: also accepts the bare array the OpenAPI declares", async () => {
  const { ctx } = mockCtx([{ body: [{ brand_code: "amazonus" }] }]);
  const out = await giftcardBrandList.execute({} as never, ctx) as { brands: unknown[] };
  assertEquals(out.brands.length, 1);
});
