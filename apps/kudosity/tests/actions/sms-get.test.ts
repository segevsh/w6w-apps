import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import smsGet from "../../actions/sms-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("sms-get: GETs the message by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "a b", status: "delivered" } }]);
  const out = await smsGet.execute({ id: "a b" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/sms/a%20b");
  assertEquals(out.status, "delivered");
});

test("sms-get: 404 surfaces", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "not found" } }]);
  await assertRejects(() => Promise.resolve(smsGet.execute({ id: "x" }, ctx)), Error, "404");
});
