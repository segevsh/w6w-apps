import { assertEquals } from "@std/assert";
import messageReportGet from "../../actions/message-report-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("message-report-get: calls GET /message-reports/42 and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { delivery: { delivered: { count: 2 } }, links: [] } }]);
  const result = await messageReportGet.execute({ "id": "42" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/message-reports/42`);
  assertEquals(calls[0].body, null);
  assertEquals(result, { "delivery": { "delivered": { "count": 2 } }, "links": [] });
});

Deno.test("message-report-get: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: { delivery: { delivered: { count: 2 } }, links: [] } }]);
  await messageReportGet.execute({ "id": "42" } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
