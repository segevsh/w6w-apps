import { assertEquals } from "@std/assert";
import statusList from "../../actions/status-list.ts";
import { asListResult, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("status-list - GETs /status", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: [{ status_id: 1 }], headers: { "content-type": "application/json" } },
  ]);
  const out = asListResult(await statusList.execute({ people_id: 123 }, ctx));
  assertEquals(pathOf(calls[0].url), "/v3/status");
  assertEquals(out.items, [{ status_id: 1 }]);
});

Deno.test("status-list - a 204 (no statuses found) is an empty page, not an error", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = asListResult(await statusList.execute({}, ctx));
  assertEquals(out.items, []);
});
