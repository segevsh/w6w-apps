import { assertEquals } from "@std/assert";
import { mockQuadernoCtx } from "../_helpers.ts";
import action from "../../actions/invoice-create.ts";

Deno.test("invoice-create: calls the documented endpoint", async () => {
  const { ctx, calls } = mockQuadernoCtx([{ status: 201, body: { id: 40 } }]);
  const out = await action.execute({
    contactId: 3,
    items: [{ description: "Work", unit_price: 10 }],
    tags: "a, b",
    paymentMethod: "cash",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/invoices");
  assertEquals(JSON.parse(calls[0].body!), {
    contact: { id: 3 },
    items: [{ description: "Work", unit_price: 10 }],
    payment_method: "cash",
    tag_list: ["a", "b"],
  });
  assertEquals(out, { id: 40 });
});

Deno.test("invoice-create: refuses a missing contact before any request", async () => {
  const { ctx, calls } = mockQuadernoCtx();
  let message = "";
  try {
    await action.execute({ items: [{ description: "x", unit_price: 1 }] } as never, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Provide either a contact ID or new contact details.");
  assertEquals(calls.length, 0);
});
