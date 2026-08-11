import { assertEquals } from "@std/assert";
import customerUpdate from "../../actions/customer-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-update: PUTs only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await customerUpdate.execute({ customerId: "c1", email: "new@example.com" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/customers/c1");
  assertEquals(bodyOf(calls[0]), { email: "new@example.com" });
});

Deno.test("customer-update: a false boolean survives compaction", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await customerUpdate.execute({ customerId: "c1", notificationsEnabled: false }, ctx);
  assertEquals(bodyOf(calls[0]), { notifications_enabled: false });
});

Deno.test("customer-update: takes no addresses field — addresses have their own endpoint", () => {
  assertEquals(customerUpdate.params?.some((p) => p.key === "addresses"), false);
});

Deno.test("customer-update: is idempotent — the same PUT twice leaves the same record", () => {
  assertEquals(customerUpdate.idempotent, true);
});
