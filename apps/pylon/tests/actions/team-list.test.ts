import { assertEquals } from "@std/assert";
import action from "../../actions/team-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("team-list: GETs /teams", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "t1", name: "Support" }], pagination: { has_next_page: false } },
  }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/teams");
  assertEquals(out, { teams: [{ id: "t1", name: "Support" }], hasNextPage: false });
});
