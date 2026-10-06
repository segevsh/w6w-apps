import { assertEquals } from "@std/assert";
import action from "../../actions/user-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("user-list: GETs /users and unwraps list", async () => {
  const { ctx, calls } = mockCtx([{ body: { list_count: 1, list: [{ user_id: 3 }] } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/users");
  assertEquals(out, { users: [{ user_id: 3 }], count: 1 });
});

Deno.test("user-list: tolerates an empty 204", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({}, ctx), { users: [], count: 0 });
});
