import { assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/group-list.ts";

Deno.test("group-list: GETs /groups.json with no query at all", async () => {
  const body = { groups: [{ id: 1, name: "staff" }], total_rows_groups: 1 };
  const { ctx, calls } = mockDiscourseCtx([{ body }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/groups.json`);
  assertEquals(out, body);
});

Deno.test("group-list: declares no params, because the reference documents none", () => {
  // Discourse publishes no filter, ordering or page-size parameter for this
  // route. Inventing one would be guessing at surface.
  assertEquals(action.params, []);
});
