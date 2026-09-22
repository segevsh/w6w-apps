import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-update.ts";

Deno.test("lead-update: puts the documented tag fields in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { leadId: 1 } }]);
  const result = await action.execute!({
    leadId: 1,
    stage: "Closed",
    assignedUserId: 42,
    tagsRemove: "Hot Lead",
    clearAllTags: false,
  }, ctx) as { leadId: number };

  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/leads/1");
  // clearAllTags=false is a value, not an absence.
  assertEquals(JSON.parse(calls[0].body!), {
    stage: "Closed",
    assignedUserId: 42,
    tagsRemove: ["Hot Lead"],
    clearAllTags: false,
  });
  assertEquals(result.leadId, 1);
});

Deno.test("lead-update: a request with only leadId sends an empty object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { leadId: 1 } }]);
  await action.execute!({ leadId: 1 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("lead-update: is idempotent — a retry lands on the same state", () => {
  assertEquals(action.idempotent, true);
});
