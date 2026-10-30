import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/group-get.ts";

test("group-get: GETs the NAME-keyed route and unwraps `group`", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { group: { id: 7, name: "staff" } } }]);
  const out = await action.execute({ name: "staff" }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/groups/staff.json`);
  // The id in this response is what the membership actions need — they are
  // id-keyed while this route is name-keyed.
  assertEquals(out, { id: 7, name: "staff" });
});

test("group-get: encodes the name", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ name: "a b" }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/groups/a%20b.json`);
});
