import { assert, assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { API_ROOT, bodyOf, mockCtx, unauthorized } from "../_helpers.ts";

Deno.test("contact-update: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, ok: true } }]);
  const result = await contactUpdate.execute({
    "contact": 42,
    "first_name": "Ann",
    "email": "ann@example.com",
  }, ctx) as { id: number };

  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contacts/42`);
  assertEquals(bodyOf(calls[0]), { "first_name": "Ann", "email": "ann@example.com" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result.id, 1);
});

Deno.test("contact-update: declares idempotent = true", () => {
  assertEquals(contactUpdate.idempotent, true);
  assertEquals(contactUpdate.type, "perform");
});

Deno.test("contact-update: sends only the fields supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42 } }]);
  await contactUpdate.execute({ contact: 42, last_name: "Lee" }, ctx);
  assertEquals(bodyOf(calls[0]), { last_name: "Lee" });
});

Deno.test("contact-update: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await contactUpdate.execute(
      { "contact": 42, "first_name": "Ann", "email": "ann@example.com" },
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
