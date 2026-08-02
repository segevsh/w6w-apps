import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-user-info.ts";

Deno.test("get-user-info: POSTs /users/info.json with an empty body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { username: "ada", hourly_quota: 1000 } }]);
  const out = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/users/info.json");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, { username: "ada", hourly_quota: 1000 });
});
