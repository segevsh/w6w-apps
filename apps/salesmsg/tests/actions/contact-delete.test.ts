import { assert, assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { API_ROOT, mockCtx, unauthorized } from "../_helpers.ts";

Deno.test("contact-delete: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: ["Contact deleted"] }]);
  const result = await contactDelete.execute({ "contact": 42 }, ctx) as { deleted: boolean };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contacts/42`);
  assertEquals(calls[0].url.includes("?"), false);
  assertEquals(calls[0].body, null);
  assertEquals(result.deleted, true);
});

Deno.test("contact-delete: declares idempotent = true", () => {
  assertEquals(contactDelete.idempotent, true);
  assertEquals(contactDelete.type, "perform");
});

Deno.test("contact-delete: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await contactDelete.execute({ "contact": 42 }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
