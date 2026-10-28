import { assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/user-team-list.ts";

Deno.test("user-team-list: lists a user's teams", async () => {
  const { ctx, calls } = mockCliqCtx([{ "status": 200, "body": { "data": [{ "team_id": 1 }] } }]);
  const out = await action.execute({ "userId": "42" } as never, ctx);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/users/42/teams");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), { "teams": [{ "team_id": 1 }] });
});

Deno.test("user-team-list: is a read action", () => {
  assertEquals(action.type, "read");
});
