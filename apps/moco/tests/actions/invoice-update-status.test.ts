import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/invoice-update-status.ts";

test("invoice-update-status: PUTs /invoices/:id/update_status and returns {} on 204", async () => {
  const { ctx, calls } = mockMocoCtx([{ status: 204 }]);
  const out = await action.execute({ invoiceId: 11, status: "sent" }, ctx);
  assertEquals(calls[0].url, "https://acme.mocoapp.com/api/v1/invoices/11/update_status");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { status: "sent" });
  assertEquals(out, {});
});

test("invoice-update-status: only offers the four documented transitions", () => {
  const statusParam = action.params?.find((p) => p.key === "status");
  const options = statusParam?.options as Array<{ value: unknown; label: string }> | undefined;
  assertEquals(options?.map((o) => o.value), ["created", "sent", "overdue", "ignored"]);
});
