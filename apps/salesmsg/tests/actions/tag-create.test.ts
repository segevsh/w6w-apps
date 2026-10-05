import { assert, assertEquals } from "@std/assert";
import tagCreate from "../../actions/tag-create.ts";
import { API_ROOT, mockCtx, queryOf, unauthorized } from "../_helpers.ts";

Deno.test("tag-create: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, ok: true } }]);
  const result = await tagCreate.execute({ "label": "vip" }, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/tags`);
  assertEquals(queryOf(calls[0].url), { "label": "vip" });
  assertEquals(calls[0].body, null);
  assertEquals(result.id, 1);
});

Deno.test("tag-create: declares idempotent = false", () => {
  assertEquals(tagCreate.idempotent, false);
  assertEquals(tagCreate.type, "perform");
});

Deno.test("tag-create: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await tagCreate.execute({ "label": "vip" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
