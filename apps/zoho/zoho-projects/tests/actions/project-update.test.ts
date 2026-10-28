import { assertEquals } from "@std/assert";
import projectUpdate from "../../actions/project-update.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("project-update: PATCH /api/v3/portal/1/projects/10", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: { "id": "10" } }]);
  const res = await projectUpdate.execute(
    {
      "portalId": "1",
      "projectId": "10",
      "name": "Renamed",
      "ownerZpuid": "7",
      "endDate": "2026-12-31",
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/10");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "name": "Renamed",
    "owner": { "zpuid": "7" },
    "end_date": "2026-12-31",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(res.item, { "id": "10" });
});
