import { assertEquals } from "@std/assert";
import timelogList from "../../actions/timelog-list.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("timelog-list: GET /api/v3/portal/1/projects/2/timelogs", async () => {
  const { ctx, calls } = mockProjectsCtx([{
    body: {
      "log_hours": {},
      "time_logs": [{ "date": "2026-10-02", "log_list": [] }],
      "page_info": { "page": 1, "per_page": 100, "has_next_page": false },
    },
  }]);
  const res = await timelogList.execute(
    {
      "portalId": "1",
      "projectId": "2",
      "viewType": "customdate",
      "startDate": "2026-10-01",
      "endDate": "2026-10-31",
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/2/timelogs");
  assertEquals(Object.fromEntries(url.searchParams), {
    "view_type": "customdate",
    "start_date": "2026-10-01",
    "end_date": "2026-10-31",
  });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.items, [{ "date": "2026-10-02", "log_list": [] }]);
  assertEquals(res.hasNext, false);
  assertEquals(res.page, 1);
});
