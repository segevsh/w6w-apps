import { assert, assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { API_ROOT, mockCtx, queryOf, unauthorized } from "../_helpers.ts";

Deno.test("tag-list: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: 1 }, { id: 2 }], meta: { current_page: 1, total: 2 } },
  }]);
  const result = await tagList.execute({ "search": "vip", "page": 1, "length": 20 }, ctx) as {
    items: unknown[];
    meta?: Record<string, unknown>;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/tags`);
  assertEquals(queryOf(calls[0].url), { "search": "vip", "page": "1", "length": "20" });
  assertEquals(calls[0].body, null);
  assertEquals(result.meta, { current_page: 1, total: 2 });
  assertEquals(result.items.length, 2);
});

Deno.test("tag-list: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await tagList.execute({ "search": "vip", "page": 1, "length": 20 }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
