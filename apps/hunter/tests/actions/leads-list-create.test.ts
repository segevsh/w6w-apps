import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/leads-list-create.ts";

test("leads-list-create: POSTs /leads_lists with the name", async () => {
  const body = envelope({ id: 3, name: "My new leads list" });
  const { ctx, calls } = mockCtx([{ status: 201, body }]);
  const result = await action.execute!({ name: "My new leads list" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/leads_lists");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "My new leads list" });
  assertEquals(result, body);
});

test("leads-list-create: is not marked idempotent", () => {
  assertEquals(action.idempotent, false);
});
