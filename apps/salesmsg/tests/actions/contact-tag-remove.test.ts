import { assert, assertEquals } from "@std/assert";
import contactTagRemove from "../../actions/contact-tag-remove.ts";
import { API_ROOT, mockCtx, unauthorized } from "../_helpers.ts";

Deno.test("contact-tag-remove: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, ok: true } }]);
  const result = await contactTagRemove.execute({ "contact": 42, "tag": 5 }, ctx) as { id: number };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/tags/contact/42/5`);
  assertEquals(calls[0].url.includes("?"), false);
  assertEquals(calls[0].body, null);
  assertEquals(result.id, 1);
});

Deno.test("contact-tag-remove: declares idempotent = true", () => {
  assertEquals(contactTagRemove.idempotent, true);
  assertEquals(contactTagRemove.type, "perform");
});

Deno.test("contact-tag-remove: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await contactTagRemove.execute({ "contact": 42, "tag": 5 }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
