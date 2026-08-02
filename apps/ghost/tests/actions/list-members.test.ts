import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-members.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("list-members: GETs /members/ and forwards search/filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { members: [{ id: "1" }] } }], { display });
  const result = await action.execute({ search: "alice", filter: "status:paid" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/ghost/api/admin/members/");
  assertEquals(url.searchParams.get("search"), "alice");
  assertEquals(url.searchParams.get("filter"), "status:paid");
  assertEquals(result.items, [{ id: "1" }]);
});
