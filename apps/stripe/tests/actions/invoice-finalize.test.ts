import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-finalize.ts";

Deno.test("invoice-finalize: POSTs the finalize route", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "open" } }]);
  await action.execute({ invoiceId: "in_1", autoAdvance: true }, ctx);
  assertEquals(calls[0].url, "https://api.stripe.com/v1/invoices/in_1/finalize");
  assertEquals(calls[0].body, "auto_advance=true");
});

Deno.test("invoice-finalize: says plainly that finalizing is one-way", () => {
  assert(action.description?.includes("cannot be edited afterwards"));
});
