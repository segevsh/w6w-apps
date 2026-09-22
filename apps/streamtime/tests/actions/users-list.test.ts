import { assertEquals } from "@std/assert";
import usersList from "../../actions/users-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("users-list: reads GET /v2/users and returns the array under a name", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, displayName: "Alex Smith" }] }]);
  const result = await usersList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/users");
  assertEquals(result, { users: [{ id: 1, displayName: "Alex Smith" }] });
});

/** An empty organisation is an empty list, not a missing key. */
Deno.test("users-list: an empty response still yields an array", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  assertEquals(await usersList.execute({}, ctx), { users: [] });
});
