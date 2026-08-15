import { assertEquals } from "@std/assert";
import trackerList from "../../actions/tracker-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tracker-list: hits trackers.json and forwards type/status/company filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("trackers", [{ id: "TRK1" }]) }]);
  const out = await trackerList.execute(
    { accountId: "ACC1", companyId: "COM1", type: "source", status: "active" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/trackers.json");
  const q = queryOf(calls[0].url);
  assertEquals(q.company_id, "COM1");
  assertEquals(q.type, "source");
  assertEquals(q.status, "active");
  assertEquals(out.trackers, [{ id: "TRK1" }]);
});
