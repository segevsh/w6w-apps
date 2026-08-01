import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-check-create.ts";

Deno.test("batch-check-create: POSTs /v1/emails:check with the emails array and returns the operation verbatim", async () => {
  const body = { name: "operations/op-1", done: false, metadata: { totalCount: 2 } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ emails: ["a@example.com", "b@example.com"] }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.mailcheck.co");
  assertEquals(url.pathname, "/v1/emails:check");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { emails: ["a@example.com", "b@example.com"] });
  assertEquals(result, body);
});

Deno.test("batch-check-create: is a non-idempotent perform action scoped to batch", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "batch");
  assertEquals(action.idempotent, false);
});
