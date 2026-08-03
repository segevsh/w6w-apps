import { assertEquals } from "@std/assert";
import { mockCtx, page } from "../_helpers.ts";
import action from "../../actions/team-member-get-many.ts";

Deno.test("team-member-get-many: GETs /team_members with cursor and team filter", async () => {
  const { ctx, calls } = mockCtx([
    { body: page([{ name: "Bob Lee", email: "bob.lee@acme.com" }], null, 10) },
  ]);
  const result = await action.execute({ cursor: "cur1", team: "Sales" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/external/v1/team_members");
  assertEquals(url.searchParams.get("cursor"), "cur1");
  assertEquals(url.searchParams.get("team"), "Sales");
  assertEquals(result.items, [{ name: "Bob Lee", email: "bob.lee@acme.com" }]);
});

Deno.test("team-member-get-many: omits unset params", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
