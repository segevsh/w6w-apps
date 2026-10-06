import { assertEquals } from "@std/assert";
import action from "../../actions/user-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("user-list: GETs /users, passing include_deactivated only when set", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "u1" }] } }, { body: { data: [] } }]);
  const out = await action.execute!({ includeDeactivated: true }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/users?include_deactivated=true");
  assertEquals(out, { users: [{ id: "u1" }], hasNextPage: false });
  await action.execute!({}, ctx);
  assertEquals(calls[1].url, "https://api.usepylon.com/users");
});

Deno.test("user-list: exposes no cursor, since the reference documents none", () => {
  assertEquals(action.params!.map((p) => p.key), ["includeDeactivated"]);
});
