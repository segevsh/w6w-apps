import { assert, assertEquals, assertRejects } from "@std/assert";
import recipientGet from "../../actions/recipient-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("recipient-get: calls GET /api/v2/recipients/99 and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 99, "name": "Ada" } }]);
  const out = await recipientGet.execute({ "recipientId": "99" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/recipients/99");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assert((out.recipient as Record<string, number>).id === 99, JSON.stringify(out));
});

Deno.test("recipient-get: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { "message": "Not Found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(recipientGet.execute({ "recipientId": "99" } as never, ctx)),
    Error,
  );
  assert(err.message.includes("HTTP 404") && err.message.includes("Not Found"), err.message);
});
