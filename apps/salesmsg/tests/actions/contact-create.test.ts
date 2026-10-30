import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import contactCreate from "../../actions/contact-create.ts";
import { API_ROOT, mockCtx, queryOf, unauthorized } from "../_helpers.ts";

test("contact-create: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, ok: true } }]);
  const result = await contactCreate.execute({
    "number": "+15551234567",
    "first_name": "Ann",
    "email": "ann@example.com",
  }, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contacts`);
  assertEquals(queryOf(calls[0].url), {
    "number": "+15551234567",
    "first_name": "Ann",
    "email": "ann@example.com",
  });
  assertEquals(calls[0].body, null);
  assertEquals(result.id, 1);
});

test("contact-create: declares idempotent = false", () => {
  assertEquals(contactCreate.idempotent, false);
  assertEquals(contactCreate.type, "perform");
});

test("contact-create: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await contactCreate.execute({
      "number": "+15551234567",
      "first_name": "Ann",
      "email": "ann@example.com",
    }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
