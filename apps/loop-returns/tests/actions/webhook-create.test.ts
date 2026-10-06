import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/webhook-create.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "topic": "return",
  "trigger": "return.closed",
  "url": "https://example.com/h",
} as Record<string, unknown>;
const RESPONSE: unknown = {
  "id": 4,
  "shop_id": 1,
  "topic": "return",
  "trigger": "return.closed",
  "url": "https://example.com/h",
  "status": "active",
};
const run = (ctx: Parameters<typeof action.execute>[1]) => action.execute(INPUT as never, ctx);

Deno.test("webhook-create: POST /webhooks", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: RESPONSE }]);
  const out = await run(ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/webhooks");
  assert(calls[0].url.startsWith("https://api.loopreturns.com/api/v1/"));
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "topic": "return",
    "trigger": "return.closed",
    "url": "https://example.com/h",
  });
  assertEquals(out, {
    "id": 4,
    "shop_id": 1,
    "topic": "return",
    "trigger": "return.closed",
    "url": "https://example.com/h",
    "status": "active",
  });
});

Deno.test("webhook-create: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: RESPONSE }]);
  await run(ctx);
  assertEquals(calls[0].headers["x-authorization"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("webhook-create: an HTTP error surfaces Loop's own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "401", http_code: "GEN-UNAUTHORIZED", message: "Unauthorized." } },
  }]);
  const err = await assertRejects(async () => await run(ctx)) as Error;
  assert(err.message.includes("HTTP 401"));
  assert(err.message.includes("GEN-UNAUTHORIZED: Unauthorized."));
});
