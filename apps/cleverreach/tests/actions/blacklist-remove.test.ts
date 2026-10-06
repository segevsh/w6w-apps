import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/blacklist-remove.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("blacklist-remove: DELETEs the encoded email", async () => {
  const { ctx, calls } = mockCtx([{ body: true }]);
  await action.execute({ email: "a+b@c.co" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://rest.cleverreach.com/v3/blacklist/a%2Bb%40c.co");
});

Deno.test("blacklist-remove: requires an email", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`email` is required");
  assertEquals(calls.length, 0);
});
