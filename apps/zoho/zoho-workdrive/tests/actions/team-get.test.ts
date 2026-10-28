import { assertEquals } from "@std/assert";
import teamGet from "../../actions/team-get.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("team-get: GET /workdrive/api/v1/teams/t%201", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{ body: { "data": { "id": "t 1", "type": "teams" } } }]);
  const res = await teamGet.execute({ "teamId": "t 1" } as never, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.zohoapis.com");
  assertEquals(url.pathname, "/workdrive/api/v1/teams/t%201");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.item, { "id": "t 1", "type": "teams" });
});
