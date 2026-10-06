import { assertEquals } from "@std/assert";
import action from "../../actions/user-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-list: GETs /users and returns an array answer as items", async () => {
  const users = [{ id: 1, first_name: "A" }];
  const { ctx, calls } = mockCtx([{ body: users }]);
  assertEquals(await action.execute({}, ctx), { items: users });
  assertEquals(pathOf(calls[0].url), "/v1/users");
  assertEquals(calls[0].method, "GET");
});

Deno.test("user-list: unwraps a paginator's data and wraps a lone object", async () => {
  const paged = mockCtx([{ body: { data: [{ id: 2 }] } }]);
  assertEquals(await action.execute({}, paged.ctx), { items: [{ id: 2 }] });
  const one = mockCtx([{ body: { id: 3 } }]);
  assertEquals(await action.execute({}, one.ctx), { items: [{ id: 3 }] });
});
