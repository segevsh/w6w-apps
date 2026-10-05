import { assert, assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { API_ROOT, bodyOf, mockCtx, unauthorized } from "../_helpers.ts";

Deno.test("contact-list: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: 1 }, { id: 2 }], meta: { current_page: 1, total: 2 } },
  }]);
  const result = await contactList.execute({ "search": "ann", "page": 2, "length": 20 }, ctx) as {
    items: unknown[];
    meta?: Record<string, unknown>;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contacts/list`);
  assertEquals(bodyOf(calls[0]), { "search": "ann", "page": 2, "length": 20 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result.meta, { current_page: 1, total: 2 });
  assertEquals(result.items.length, 2);
});

Deno.test("contact-list: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await contactList.execute({ "search": "ann", "page": 2, "length": 20 }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
