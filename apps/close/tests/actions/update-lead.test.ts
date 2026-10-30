import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-lead.ts";

test("update-lead: is an idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

test("update-lead: PUTs /lead/{id}/ with only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "lead_1" } }]);
  await action.execute({ leadId: "lead_1", statusId: "stat_2" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/lead/lead_1/");
  // Close's PUT is a patch — unmentioned fields must not travel at all.
  assertEquals(JSON.parse(calls[0].body!), { status_id: "stat_2" });
});

test("update-lead: sends an empty body when nothing was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ leadId: "lead_1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

test("update-lead: merges custom fields alongside regular ones", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ leadId: "lead_1", name: "New", customFields: { cf_a: 1 } }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "New", "custom.cf_a": 1 });
});
