import { assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/team-get.ts";

Deno.test("team-get: gets a team", async () => {
  const { ctx, calls } = mockCliqCtx([{
    "status": 200,
    "body": { "team_id": "53797404", "name": "Zylker" },
  }]);
  const out = await action.execute({ "teamId": "53797404" } as never, ctx);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/teams/53797404");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), {
    "team": { "team_id": "53797404", "name": "Zylker" },
  });
});

Deno.test("team-get: is a read action", () => {
  assertEquals(action.type, "read");
});
