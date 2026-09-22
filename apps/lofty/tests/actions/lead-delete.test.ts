import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-delete.ts";

Deno.test("lead-delete: sends the required reason as a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await action.execute!({ leadId: 7, reason: "duplicate of lead 3" }, ctx) as {
    leadId: number;
    status: number;
  };

  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/leads/7");
  assertEquals(url.searchParams.get("reason"), "duplicate of lead 3");
  // The reason is documented as a query parameter, not body content.
  assertEquals(calls[0].body, null);
  assertEquals(result, { leadId: 7, status: 200 });
});

Deno.test("lead-delete: the reason field is required", () => {
  const reason = action.params!.find((p) => p.key === "reason")!;
  assertEquals(reason.required, true);
  assert(/recorded/i.test(reason.hint!), reason.hint);
});

Deno.test("lead-delete: is idempotent — the lead ends in the trash either way", () => {
  assertEquals(action.idempotent, true);
});
