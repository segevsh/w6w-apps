import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-list: the documented bare array is folded into a page", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uuid: "u1" }, { uuid: "u2" }] }]);
  const out = await userList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/users/");
  assertEquals(out, {
    results: [{ uuid: "u1" }, { uuid: "u2" }],
    count: 2,
    next: null,
    previous: null,
  });
});

Deno.test("user-list: a paginated envelope still works if Avoma starts sending one", async () => {
  const { ctx } = mockCtx([{
    body: {
      count: 9,
      next: "https://api.avoma.com/v1/users/?page=2",
      previous: null,
      results: [{ uuid: "u1" }],
    },
  }]);
  const out = await userList.execute({}, ctx) as { count: number; next: string };
  assertEquals(out.count, 9);
  assertEquals(out.next, "https://api.avoma.com/v1/users/?page=2");
});
