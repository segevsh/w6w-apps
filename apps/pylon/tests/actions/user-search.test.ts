import { assertEquals } from "@std/assert";
import action from "../../actions/user-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("user-search: one email becomes an equals filter on email", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "u1" }] } }]);
  const out = await action.execute!({ email: "a@b.com" }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/users/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    filter: { field: "email", operator: "equals", value: "a@b.com" },
  });
  assertEquals(out, { users: [{ id: "u1" }], hasNextPage: false });
});

Deno.test("user-search: several emails become an `in` filter with values", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ emails: "a@b.com, c@d.com", limit: 5 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    filter: { field: "email", operator: "in", values: ["a@b.com", "c@d.com"] },
    limit: 5,
  });
});

Deno.test("user-search: no email sends no filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
