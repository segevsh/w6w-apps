import { assertEquals } from "@std/assert";
import milestoneUpdate from "../../actions/milestone-update.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("milestone-update: PATCH /api/v3.1/portal/1/projects/2/phases/50", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: { "id": "50" } }]);
  const res = await milestoneUpdate.execute(
    {
      "portalId": "1",
      "projectId": "2",
      "milestoneId": "50",
      "endDate": "2026-12-01",
      "color": "#4573d2",
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3.1/portal/1/projects/2/phases/50");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "end_date": "2026-12-01",
    "color": "#4573d2",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(res.item, { "id": "50" });
});
