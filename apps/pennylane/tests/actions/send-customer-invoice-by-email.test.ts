import { assert, assertEquals } from "@std/assert";
import { mockCtx, rejection } from "../_helpers.ts";
import action from "../../actions/send-customer-invoice-by-email.ts";

Deno.test("send-customer-invoice-by-email: POSTs /customer_invoices/{id}/send_by_email with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const res = await action.execute({ id: "10" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/external/v2/customer_invoices/10/send_by_email",
  );
  assertEquals(calls[0].body, null);
  assertEquals(res, { sent: true });
});

Deno.test("send-customer-invoice-by-email: a 409 is explained as the PDF not being ready yet", async () => {
  const { ctx } = mockCtx([{
    status: 409,
    body: { status: 409, error: "Conflict with the current state of the target resource" },
  }]);
  const err = await rejection(action.execute({ id: "10" }, ctx));
  assert(err instanceof Error);
  assert(err.message.includes("PDF"), err.message);
  assert(err.message.includes("retry in a few minutes"), err.message);
});

Deno.test("send-customer-invoice-by-email: other failures are re-thrown unchanged", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: "not_found", message: "The resource was not found" },
  }]);
  const err = await rejection(action.execute({ id: "10" }, ctx));
  assert(err instanceof Error);
  assert(err.message.includes("404"), err.message);
  assert(!err.message.includes("retry in a few minutes"), err.message);
});
