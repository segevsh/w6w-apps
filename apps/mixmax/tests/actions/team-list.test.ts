import { assertEquals } from "@std/assert";
import action from "../../actions/team-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("team-list: GET /teams?expand=members", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{ _id: "tm1" }] } }]);
  const out = await action.execute!({ expandMembers: true } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/teams?expand=members");
  assertEquals(calls[0].body, null);
  assertEquals(out, { results: [{ _id: "tm1" }] });
});
