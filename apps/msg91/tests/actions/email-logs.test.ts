import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/email-logs.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("email-logs: GET /api/v5/report/logs/mail with the window, request id, fields and limit", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ status: "Delivered" }], metadata: { total: 6, paginationToken: "t" } },
  }]);
  const out = await action.execute({
    startDate: "2026-10-04",
    endDate: "2026-10-06",
    requestId: "rid",
    fields: "status,telNum",
    limit: 50,
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v5/report/logs/mail");
  assertEquals(queryOf(calls[0].url), {
    startDate: "2026-10-04",
    endDate: "2026-10-06",
    requestId: "rid",
    fields: "status,telNum",
    limit: "50",
  });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(out.total, 6);
  assertEquals(out.data, [{ status: "Delivered" }]);
});

Deno.test("email-logs: total falls back to the row count without metadata", async () => {
  const { ctx } = mockCtx([{ body: { data: [{}, {}] } }]);
  const out = await action.execute({ startDate: "a", endDate: "b" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(out.total, 2);
});

Deno.test("email-logs: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], metadata: { total: 0 } } }]);
  await action.execute({ startDate: "2026-10-04", endDate: "2026-10-06" }, ctx);
  assertEquals(calls[0].headers.authkey, undefined);
  assert(!calls[0].url.toLowerCase().includes("authkey"));
  assert(calls[0].url.startsWith("https://control.msg91.com/api/v5/"));
});

Deno.test("email-logs: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ body: { type: "error", message: "Auth Key missing" } }]);
  const err = await assertRejects(async () =>
    await action.execute({ startDate: "2026-10-04", endDate: "2026-10-06" }, ctx)
  ) as Error;
  assert(err.message.includes("Auth Key missing"));
});
