import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-whitelist.ts";

test("add-whitelist: POSTs /whitelists/add.json with email and optional comment", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { email: "a@x.com", added: true } }]);
  await action.execute!({ email: "a@x.com", comment: "vip" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/whitelists/add.json");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@x.com", comment: "vip" });
});
