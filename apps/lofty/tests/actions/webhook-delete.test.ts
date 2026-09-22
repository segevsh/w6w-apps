import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-delete.ts";

Deno.test("webhook-delete: deletes by subscription id on the singular path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await action.execute!({ subscribeId: 1234 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.lofty.com/v1.0/webhook/1234");
  assertEquals(result, { subscribeId: 1234, status: 200 });
});

Deno.test("webhook-delete: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
