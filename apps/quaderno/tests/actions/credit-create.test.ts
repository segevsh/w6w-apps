import { assertEquals } from "@std/assert";
import { mockQuadernoCtx } from "../_helpers.ts";
import action from "../../actions/credit-create.ts";

Deno.test("credit-create: calls the documented endpoint", async () => {
  const { ctx, calls } = mockQuadernoCtx([{ status: 201, body: { id: 3, state: "outstanding" } }]);
  const out = await action.execute({ invoiceId: 40, creditedAmount: 5 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/credits");
  assertEquals(JSON.parse(calls[0].body!), { invoice_id: 40, credited_amount: 5 });
  assertEquals(out, { id: 3, state: "outstanding" });
});
