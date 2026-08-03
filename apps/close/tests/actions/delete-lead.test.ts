import { assert, assertEquals } from "@std/assert";
import { description, mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-lead.ts";

Deno.test("delete-lead: DELETEs /lead/{id}/ and returns an empty result", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ leadId: "lead_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/lead/lead_1/");
  assertEquals(out, {});
});

Deno.test("delete-lead: logs a warning, because this is destructive", async () => {
  const { ctx, logs } = mockCtx([{ status: 204 }]);
  await action.execute({ leadId: "lead_1" }, ctx);
  assertEquals(logs[0].level, "warn");
});

Deno.test("delete-lead: declares itself idempotent and says it is destructive", () => {
  // Retrying a delete converges on the same end state.
  assertEquals(action.idempotent, true);
  assert(/destructive|irreversible/i.test(description(action)));
});
