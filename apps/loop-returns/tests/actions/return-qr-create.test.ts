import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/return-qr-create.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "name": "#1001", "zip": "43215", "type": "svg", "size": 300 } as Record<
  string,
  unknown
>;
const RESPONSE: unknown = { "qr": "https://q/1.svg", "deeplink_url": "https://x/a" };
const run = (ctx: Parameters<typeof action.execute>[1]) => action.execute(INPUT as never, ctx);

Deno.test("return-qr-create: POST /order/qr", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await run(ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/order/qr");
  assert(calls[0].url.startsWith("https://api.loopreturns.com/api/v1/"));
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), { "name": "#1001", "zip": "43215", "type": "svg", "size": 300 });
  assertEquals(out, { "qr": "https://q/1.svg", "deeplink_url": "https://x/a" });
});

Deno.test("return-qr-create: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await run(ctx);
  assertEquals(calls[0].headers["x-authorization"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("return-qr-create: an HTTP error surfaces Loop's own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "401", http_code: "GEN-UNAUTHORIZED", message: "Unauthorized." } },
  }]);
  const err = await assertRejects(async () => await run(ctx)) as Error;
  assert(err.message.includes("HTTP 401"));
  assert(err.message.includes("GEN-UNAUTHORIZED: Unauthorized."));
});

Deno.test("return-qr-create: an HTTP 200 carrying an error body is still a failure", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { "error": { "message": "Order not available" } },
  }]);
  const err = await assertRejects(async () => await run(ctx)) as Error;
  assert(err.message.includes("refused the request"));
});
