import { assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/post-delete.ts";

Deno.test("post-delete: DELETEs /posts/{id}.json with no body by default", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ status: 200, body: "" }]);
  const out = await action.execute({ postId: 5 }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/posts/5.json`);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, { deleted: true, post_id: 5 });
});

Deno.test("post-delete: force_destroy is sent only when explicitly asked for", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ status: 200, body: "" }]);
  await action.execute({ postId: 5, forceDestroy: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { force_destroy: true });
});

Deno.test("post-delete: the permanent-delete flag warns about both preconditions", () => {
  const flag = action.params!.find((p) => p.key === "forceDestroy")!;
  // Discourse requires `can_permanently_delete` AND a prior ordinary delete at
  // least five minutes earlier. Neither can be enforced by a param, so both are
  // stated.
  assertEquals(flag.advanced, true);
  assertEquals(flag.hint!.includes("can_permanently_delete"), true);
  assertEquals(flag.hint!.includes("five minutes"), true);
});
