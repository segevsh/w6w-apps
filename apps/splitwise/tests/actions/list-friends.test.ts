import { assertEquals } from "@std/assert";
import listFriends from "../../actions/list-friends.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-friends: reads the friends envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      friends: [{
        id: 15,
        first_name: "Ada",
        balance: [{ currency_code: "USD", amount: "-5.02" }],
        groups: [{ group_id: 571, balance: [{ currency_code: "USD", amount: "-5.02" }] }],
      }],
    },
  }]);
  const out = await listFriends.execute({}, ctx) as { friends: Array<{ id: number }> };

  assertEquals(pathOf(calls[0].url), "/api/v3.0/get_friends");
  assertEquals(out.friends[0].id, 15);
});

Deno.test("list-friends: takes no params — the endpoint has no pagination", () => {
  assertEquals(listFriends.params?.length, 0);
});

Deno.test("list-friends: a missing key yields an empty list", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await listFriends.execute({}, ctx), { friends: [] });
});
