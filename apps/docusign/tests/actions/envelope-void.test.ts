import { assertEquals } from "@std/assert";
import { ACCOUNT_BASE, bodyOf, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/envelope-void.ts";

Deno.test("envelope-void: PUTs status=voided with the required reason", async () => {
  const { ctx, calls } = mockCtx([{ body: { envelopeId: "e1", status: "voided" } }]);
  await action.execute({ envelopeId: "e1", voidedReason: "Deal cancelled" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/envelopes/e1`);
  assertEquals(bodyOf(calls[0]), { status: "voided", voidedReason: "Deal cancelled" });
});

Deno.test("envelope-void: sends no query parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ envelopeId: "e1", voidedReason: "r" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("envelope-void: the reason is required, matching Docusign", () => {
  assertEquals(action.params?.find((p) => p.key === "voidedReason")?.required, true);
});

Deno.test("envelope-void: is idempotent — voiding twice cancels one thing", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
