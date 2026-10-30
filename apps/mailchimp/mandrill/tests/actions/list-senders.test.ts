import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-senders.ts";

test("list-senders: POSTs /users/senders.json with an empty body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ address: "ada@x.com" }] }]);
  const out = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/users/senders.json");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, [{ address: "ada@x.com" }]);
});
