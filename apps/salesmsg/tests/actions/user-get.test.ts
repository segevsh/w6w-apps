import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import userGet from "../../actions/user-get.ts";
import { API_ROOT, mockCtx, unauthorized } from "../_helpers.ts";

test("user-get: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, ok: true } }]);
  const result = await userGet.execute({}, ctx) as { id: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/user`);
  assertEquals(calls[0].url.includes("?"), false);
  assertEquals(calls[0].body, null);
  assertEquals(result.id, 1);
});

test("user-get: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await userGet.execute({}, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
