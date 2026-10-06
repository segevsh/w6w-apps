import { assertEquals } from "@std/assert";
import { mockQuadernoCtx } from "../_helpers.ts";
import action from "../../actions/invoice-deliver.ts";

Deno.test("invoice-deliver: calls the documented endpoint", async () => {
  const { ctx, calls } = mockQuadernoCtx([{ body: "" }]);
  const out = await action.execute({ id: 40 }, ctx);
  assertEquals(calls.length, 1);
  // Quaderno documents delivery as a GET.
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/invoices/40/deliver");
  assertEquals(out, { delivered: true, id: 40 });
});
