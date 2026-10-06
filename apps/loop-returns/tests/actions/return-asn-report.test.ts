import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/return-asn-report.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "from": "2026-01-01", "to": "2026-01-02" } as Record<string, unknown>;
const RESPONSE: unknown = [{ "id": 1, "sku": "X" }];
const run = (ctx: Parameters<typeof action.execute>[1]) => action.execute(INPUT as never, ctx);

Deno.test("return-asn-report: GET /warehouse/reporting/asn", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await run(ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/warehouse/reporting/asn");
  assert(calls[0].url.startsWith("https://api.loopreturns.com/api/v1/"));
  assertEquals(queryOf(calls[0].url), { "from": "2026-01-01", "to": "2026-01-02" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(out, { "items": [{ "id": 1, "sku": "X" }] });
});

Deno.test("return-asn-report: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await run(ctx);
  assertEquals(calls[0].headers["x-authorization"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("return-asn-report: an HTTP error surfaces Loop's own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "401", http_code: "GEN-UNAUTHORIZED", message: "Unauthorized." } },
  }]);
  const err = await assertRejects(async () => await run(ctx)) as Error;
  assert(err.message.includes("HTTP 401"));
  assert(err.message.includes("GEN-UNAUTHORIZED: Unauthorized."));
});

Deno.test("return-asn-report: a malformed date is refused instead of silently becoming the epoch", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () =>
    await action.execute({ from: "01/02/2026" } as never, ctx)
  ) as Error;
  assert(err.message.includes("yyyy-mm-dd"));
  assertEquals(calls.length, 0);
});
