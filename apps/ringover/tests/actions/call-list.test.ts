import { assertEquals } from "@std/assert";
import action from "../../actions/call-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("call-list: repeats array params and unwraps call_list", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      call_list_count: 2,
      total_call_count: 40,
      total_missed_call_count: 3,
      call_list: [{ cdr_id: 90 }, { cdr_id: 85 }],
    },
  }]);
  const out = await action.execute!({
    startDate: "2026-10-01T00:00:00Z",
    endDate: "2026-10-05T00:00:00Z",
    callType: ["ANSWERED", "MISSED"],
    expand: "summary",
    limitCount: 2,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/calls");
  assertEquals(url.searchParams.getAll("call_type"), ["ANSWERED", "MISSED"]);
  assertEquals(url.searchParams.get("expand"), "summary");
  assertEquals(url.searchParams.get("limit_count"), "2");
  assertEquals(out, {
    calls: [{ cdr_id: 90 }, { cdr_id: 85 }],
    count: 2,
    total: 40,
    totalMissed: 3,
    lastId: 85,
  });
});

Deno.test("call-list: a 204 is an empty page", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({}, ctx), {
    calls: [],
    count: 0,
    total: 0,
    totalMissed: 0,
  });
});
