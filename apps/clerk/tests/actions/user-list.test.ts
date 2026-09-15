import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

Deno.test("user-list: hits GET /users and wraps the bare array as `{ data }`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "user_1" }] }]);
  const out = await action.execute!({ limit: 5 }, ctx) as { data: unknown[] };
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/users");
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "5");
  assertEquals(out.data.length, 1);
});

Deno.test("user-list: a comma-separated email filter becomes repeated query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ emailAddress: "a@x.com, b@x.com" }, ctx);
  assertEquals(calls[0].url.match(/email_address=/g)?.length, 2);
});

Deno.test("user-list: banned=false is sent, not dropped as falsy", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ banned: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("banned"), "false");
});
