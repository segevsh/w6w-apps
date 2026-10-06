import { assertEquals } from "@std/assert";
import { mockQuadernoCtx } from "../_helpers.ts";
import action from "../../actions/invoice-void.ts";

Deno.test("invoice-void: calls the documented endpoint", async () => {
  const { ctx, calls } = mockQuadernoCtx([{ body: { id: 40, state: "archived" } }]);
  const out = await action.execute({ id: 40, voidReason: "duplicate" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/invoices/40/void");
  assertEquals(JSON.parse(calls[0].body!), { void_reason: "duplicate" });
  assertEquals(out, { id: 40, state: "archived" });
});
