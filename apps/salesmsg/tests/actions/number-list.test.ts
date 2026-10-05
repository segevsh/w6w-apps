import { assert, assertEquals } from "@std/assert";
import numberList from "../../actions/number-list.ts";
import { API_ROOT, mockCtx, queryOf, unauthorized } from "../_helpers.ts";

Deno.test("number-list: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: 1 }, { id: 2 }] } }]);
  const result = await numberList.execute({ "query": "555", "limit": 10 }, ctx) as {
    items: unknown[];
    meta?: Record<string, unknown>;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/numbers`);
  assertEquals(queryOf(calls[0].url), { "query": "555", "limit": "10" });
  assertEquals(calls[0].body, null);
  assertEquals(result.items.length, 2);
});

Deno.test("number-list: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await numberList.execute({ "query": "555", "limit": 10 }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
