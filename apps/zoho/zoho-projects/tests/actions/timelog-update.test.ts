import { assertEquals } from "@std/assert";
import timelogUpdate from "../../actions/timelog-update.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("timelog-update: PATCH /api/v3/portal/1/projects/2/logs/70", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: { "id": "70" } }]);
  const res = await timelogUpdate.execute(
    {
      "portalId": "1",
      "projectId": "2",
      "logId": "70",
      "hours": "02.00",
      "billStatus": "Non Billable",
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/2/logs/70");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "bill_status": "Non Billable",
    "hours": "02.00",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(res.item, { "id": "70" });
});
