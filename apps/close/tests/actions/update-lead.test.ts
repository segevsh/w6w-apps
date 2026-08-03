import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-lead.ts";

Deno.test("update-lead: is an idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

Deno.test("update-lead: PUTs /lead/{id}/ with only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "lead_1" } }]);
  await action.execute({ leadId: "lead_1", statusId: "stat_2" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/lead/lead_1/");
  // Close's PUT is a patch — unmentioned fields must not travel at all.
  assertEquals(JSON.parse(calls[0].body!), { status_id: "stat_2" });
});

Deno.test("update-lead: sends an empty body when nothing was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ leadId: "lead_1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("update-lead: merges custom fields alongside regular ones", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ leadId: "lead_1", name: "New", customFields: { cf_a: 1 } }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "New", "custom.cf_a": 1 });
});
