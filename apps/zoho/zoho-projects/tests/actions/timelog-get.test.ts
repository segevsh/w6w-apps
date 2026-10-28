import { assertEquals } from "@std/assert";
import timelogGet from "../../actions/timelog-get.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("timelog-get: GET /api/v3/portal/1/projects/2/logs/70", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: { "id": "70" } }]);
  const res = await timelogGet.execute(
    { "portalId": "1", "projectId": "2", "logId": "70" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects/2/logs/70");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.item, { "id": "70" });
});
