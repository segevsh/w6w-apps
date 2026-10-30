import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-rejects.ts";

test("list-rejects: POSTs /rejects/list.json with defaults", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/rejects/list.json");
  assertEquals(JSON.parse(calls[0].body!), { include_expired: false });
});

test("list-rejects: forwards email filter and includeExpired", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ email: "a@x.com", includeExpired: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { email: "a@x.com", include_expired: true });
});
