import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-contact-list.ts";

Deno.test("delete-contact-list: DELETEs /v3/contact_lists/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: { activity_id: "a1", state: "initialized" },
  }]);
  await action.execute!({ listId: "l1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v3/contact_lists/l1");
  assertEquals(calls[0].body, null);
});

Deno.test("delete-contact-list: returns the 202 activity rather than a bare success flag", async () => {
  const { ctx } = mockCtx([{
    status: 202,
    body: { activity_id: "a1", state: "initialized", percent_done: 0 },
  }]);
  const out = await action.execute!({ listId: "l1" }, ctx) as Record<string, unknown>;
  assertEquals(out.activity_id, "a1");
  assertEquals(out.state, "initialized");
});

Deno.test("delete-contact-list: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
