import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/delete-suppression.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("delete-suppression: an email identifier is URL-encoded, an id is not", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: null } }, { body: { data: null } }]);
  assertEquals(await run(action, { identifier: "user@example.com" }, ctx), { removed: true });
  await run(action, { identifier: 123 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/suppressions/user%40example.com");
  assertEquals(calls[1].url, "https://api.maileroo.com/v1/suppressions/123");
});

Deno.test("delete-suppression: a 404 (not suppressed) throws", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: { message: "not on your suppression list" } },
  }]);
  await assertRejects(() => run(action, { identifier: "x@y.co" }, ctx), Error, "suppression list");
});
