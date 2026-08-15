import { assertEquals } from "@std/assert";
import customerEmailUpdate from "../../actions/customer-email-update.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-email-update: calls POST /customerEmailUpdate with a JSON body", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, message: "Customer email updated successfully" } },
  ]);
  await customerEmailUpdate.execute(
    { currentEmail: "old@example.com", newEmail: "new@example.com" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/customerEmailUpdate");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(jsonBodyOf(calls[0]), {
    current_email: "old@example.com",
    new_email: "new@example.com",
    allow_merge: false,
  });
});

Deno.test("customer-email-update: allowMerge is sent when explicitly true", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await customerEmailUpdate.execute(
    { currentEmail: "old@example.com", newEmail: "new@example.com", allowMerge: true },
    ctx,
  );
  assertEquals((jsonBodyOf(calls[0]) as { allow_merge: boolean }).allow_merge, true);
});

Deno.test("customer-email-update: is idempotent", () => {
  assertEquals(customerEmailUpdate.idempotent, true);
});
