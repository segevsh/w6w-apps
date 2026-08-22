import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-get.ts";

Deno.test("account-get: reads the account and its quotas", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { account: { account_id: "a1", quotas: { documents_left: 5 } } },
  }]);
  const result = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/account");
  assertEquals(result.quotas, { documents_left: 5 });
});

Deno.test("account-get: can look up someone else by id or email", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account: {} } }]);
  await action.execute!({ accountId: "a2", emailAddress: "ada@example.com" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("account_id"), "a2");
  assertEquals(q.get("email_address"), "ada@example.com");
});

/** A free plan can only ever create test-mode requests. */
Deno.test("account-get: the plan flag is surfaced and says what it means", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "is_paid_hs")!.label.includes("test-mode only"));
});
