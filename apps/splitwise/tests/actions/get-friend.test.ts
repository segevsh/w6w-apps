import { assertEquals, assertRejects } from "@std/assert";
import getFriend from "../../actions/get-friend.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-friend: takes the friend's USER id, not a friendship id", async () => {
  const { ctx, calls } = mockCtx([{ body: { friend: { id: 15, first_name: "Ada" } } }]);
  const out = await getFriend.execute({ userId: 15 }, ctx) as { id: number };

  assertEquals(pathOf(calls[0].url), "/api/v3.0/get_friend/15");
  assertEquals(out.id, 15);
});

Deno.test("get-friend: a bad id fails before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await getFriend.execute({ userId: -1 as unknown as number }, ctx),
    Error,
    "userId must be a positive integer id",
  );
  assertEquals(calls.length, 0);
});
