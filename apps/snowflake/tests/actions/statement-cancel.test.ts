import { assertEquals } from "@std/assert";
import { mockSnowflakeCtx } from "../_helpers.ts";
import action from "../../actions/statement-cancel.ts";

Deno.test("statement-cancel: POSTs /api/v2/statements/{handle}/cancel", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{
    status: 200,
    body: { success: true, message: "ok" },
  }]);
  const out = await action.execute({ statementHandle: "h1" }, ctx);
  assertEquals(calls[0].url, "https://acme.snowflakecomputing.com/api/v2/statements/h1/cancel");
  assertEquals(calls[0].method, "POST");
  assertEquals(out, { success: true, message: "ok" });
});

Deno.test("statement-cancel: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
