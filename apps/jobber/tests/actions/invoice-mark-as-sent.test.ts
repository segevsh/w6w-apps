import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-mark-as-sent.ts";

Deno.test("invoice-mark-as-sent: the argument is plain `id`", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        invoiceMarkAsSent: { invoice: { id: "i1", invoiceStatus: "sent_not_due" }, userErrors: [] },
      },
    },
  }]);
  await action.execute({ invoiceId: "i1" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(sent.query.includes("invoiceMarkAsSent(id: $id)"));
  assertEquals(sent.variables, { id: "i1" });
});

Deno.test("invoice-mark-as-sent: sends no email — nothing in the document asks for one", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { invoiceMarkAsSent: { invoice: { id: "i1" }, userErrors: [] } } },
  }]);
  await action.execute({ invoiceId: "i1" }, ctx);
  assert(!/SendEmail|sendEmail/.test(JSON.parse(calls[0].body!).query));
});

Deno.test("invoice-mark-as-sent: userErrors throws", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        invoiceMarkAsSent: { invoice: null, userErrors: [{ message: "Invoice is not a draft" }] },
      },
    },
  }]);
  await assertRejects(
    async () => await action.execute({ invoiceId: "i1" }, ctx),
    Error,
    "not a draft",
  );
});
