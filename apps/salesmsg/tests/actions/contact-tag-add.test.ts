import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import contactTagAdd from "../../actions/contact-tag-add.ts";
import { API_ROOT, mockCtx, unauthorized } from "../_helpers.ts";

test("contact-tag-add: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, ok: true } }]);
  const result = await contactTagAdd.execute({ "contact": 42, "tag": 5 }, ctx) as { id: number };

  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/tags/contact/42/5`);
  assertEquals(calls[0].url.includes("?"), false);
  assertEquals(calls[0].body, null);
  assertEquals(result.id, 1);
});

test("contact-tag-add: declares idempotent = true", () => {
  assertEquals(contactTagAdd.idempotent, true);
  assertEquals(contactTagAdd.type, "perform");
});

test("contact-tag-add: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await contactTagAdd.execute({ "contact": 42, "tag": 5 }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
