import { assert, assertEquals } from "@std/assert";
import contactSearch from "../../actions/contact-search.ts";
import { API_ROOT, mockCtx, queryOf, unauthorized } from "../_helpers.ts";

Deno.test("contact-search: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{ id: 1 }, { id: 2 }] } }]);
  const result = await contactSearch.execute({ "term": "ann" }, ctx) as {
    items: unknown[];
    meta?: Record<string, unknown>;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contacts/search`);
  assertEquals(queryOf(calls[0].url), { "term": "ann" });
  assertEquals(calls[0].body, null);
  assertEquals(result.items.length, 2);
});

Deno.test("contact-search: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await contactSearch.execute({ "term": "ann" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
