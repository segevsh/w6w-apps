import { assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GETs /u/{username}.json and unwraps the `user` envelope", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { user: { id: 3, username: "alice" } } }]);
  const out = await action.execute({ username: "alice" }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/u/alice.json`);
  assertEquals(out, { id: 3, username: "alice" });
});

Deno.test("user-get: an unenveloped response passes through unchanged", async () => {
  const { ctx } = mockDiscourseCtx([{ body: { id: 3 } }]);
  assertEquals(await action.execute({ username: "alice" }, ctx), { id: 3 });
});

Deno.test("user-get: encodes the username", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ username: "a/b" }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/u/a%2Fb.json`);
});
