import { assertEquals } from "@std/assert";
import timelogCreate from "../../actions/timelog-create.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("timelog-create: POST /api/v3/portal/1/projects/2/log", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: { "id": "70" } }]);
  const res = await timelogCreate.execute(
    {
      "portalId": "1",
      "projectId": "2",
      "moduleType": "task",
      "moduleId": "40",
      "date": "2026-10-02",
      "billStatus": "Billable",
      "hours": "01.00",
      "notes": "n",
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/2/log");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "module": { "type": "task", "id": "40" },
    "date": "2026-10-02",
    "bill_status": "Billable",
    "hours": "01.00",
    "notes": "n",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(res.item, { "id": "70" });
});
