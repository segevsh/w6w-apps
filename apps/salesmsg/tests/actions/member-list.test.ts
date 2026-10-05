import { assert, assertEquals } from "@std/assert";
import memberList from "../../actions/member-list.ts";
import { API_ROOT, mockCtx, unauthorized } from "../_helpers.ts";

Deno.test("member-list: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }, { id: 2 }] }]);
  const result = await memberList.execute({}, ctx) as {
    items: unknown[];
    meta?: Record<string, unknown>;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/organization/members`);
  assertEquals(calls[0].url.includes("?"), false);
  assertEquals(calls[0].body, null);
  assertEquals(result.items.length, 2);
});

Deno.test("member-list: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await memberList.execute({}, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
