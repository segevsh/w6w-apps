import { assertEquals } from "@std/assert";
import action from "../../actions/team-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("team-get: GET /teams/tm1", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "tm1", name: "Sales" } }]);
  const out = await action.execute!({ teamId: "tm1" } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/teams/tm1");
  assertEquals(calls[0].body, null);
  assertEquals(out, { team: { _id: "tm1", name: "Sales" } });
});
