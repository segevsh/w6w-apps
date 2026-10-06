import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("user-list: GET /v1/users with assignable and email filters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { users: [{ id: 1, firstName: "A" }], nextCursor: null },
  }]);
  const out = await userList.execute(
    { onlyAssignable: true, email: "a@b.co", expand: "role" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/users");
  assertEquals(queryAll(calls[0].url), {
    onlyAssignable: ["true"],
    email: ["a@b.co"],
    expand: ["role"],
  });
  assertEquals(out, { users: [{ id: 1, firstName: "A" }], nextCursor: null });
});

Deno.test("user-list: onlyAssignable false is omitted, not sent as false", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [], nextCursor: null } }]);
  await userList.execute({ onlyAssignable: false }, ctx);
  assertEquals(queryAll(calls[0].url), {});
});
