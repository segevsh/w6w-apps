import { assertEquals } from "@std/assert";
import action from "../../actions/team-member-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("team-member-list: GET /teams/tm1/members", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{ userId: "u1" }] } }]);
  const out = await action.execute!({ teamId: "tm1" } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/teams/tm1/members");
  assertEquals(calls[0].body, null);
  assertEquals(out, { results: [{ userId: "u1" }] });
});
