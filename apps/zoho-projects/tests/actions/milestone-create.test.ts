import { assertEquals } from "@std/assert";
import milestoneCreate from "../../actions/milestone-create.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("milestone-create: POST /api/v3.1/portal/1/projects/2/phases", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: { "id": "50" } }]);
  const res = await milestoneCreate.execute(
    {
      "portalId": "1",
      "projectId": "2",
      "name": "Beta",
      "ownerZpuid": "7",
      "statusId": "5",
      "startDate": "2026-10-01",
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3.1/portal/1/projects/2/phases");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "name": "Beta",
    "owner": { "zpuid": "7" },
    "status": { "id": "5" },
    "start_date": "2026-10-01",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(res.item, { "id": "50" });
});
