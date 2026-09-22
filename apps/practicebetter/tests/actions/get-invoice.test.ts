import { assertEquals } from "@std/assert";
import action from "../../actions/get-invoice.ts";
import { API_ROOT, mockCtx, queryOf, urlOf } from "../_helpers.ts";

const invoice = {
  id: "inv-1",
  currency: "USD",
  amountDue: { amount: 120, currency: "USD" },
  clientRecord: { id: "rec-1" },
};

Deno.test("get-invoice: reads /consultant/payments/invoices/{invoiceId}", async () => {
  const { ctx, calls } = mockCtx([{ body: invoice }]);
  const result = await action.execute({ invoiceId: "inv-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/payments/invoices/inv-1`);
  assertEquals(result, invoice);
});

Deno.test("get-invoice: the optional alt parameter is passed through verbatim", async () => {
  const bare = mockCtx([{ body: invoice }]);
  await action.execute({ invoiceId: "inv-1" }, bare.ctx);
  assertEquals(new URL(bare.calls[0].url).search, "");

  const withAlt = mockCtx([{ body: invoice }]);
  await action.execute({ invoiceId: "inv-1", alt: "summary" }, withAlt.ctx);
  assertEquals(queryOf(withAlt.calls[0].url).alt, "summary");
});

Deno.test("get-invoice: the money fields are declared as Money objects, not numbers", () => {
  const money = (action.output as Array<{ key: string; type: string }>).filter((o) =>
    o.key.startsWith("amount")
  );
  assertEquals(money.map((o) => o.key), [
    "amountDue",
    "amountPaid",
    "amountPayable",
    "amountRefunded",
    "amountWrittenOff",
  ]);
  assertEquals(money.every((o) => o.type === "object"), true);
  assertEquals(action.params!.find((p) => p.key === "invoiceId")!.required, true);
});
