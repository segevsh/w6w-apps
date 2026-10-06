import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { mockCtx, ok, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: items plus the sibling paging counters", async () => {
  const { ctx, calls } = mockCtx([{
    body: ok({ items: [{ id: "ct1" }], total: 1, page_size: 20, page_number: 1 }),
  }]);
  const out = await contactList.execute({ search: "+1415" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/contacts");
  assertEquals(queryOf(calls[0].url), { search: "+1415" });
  assertEquals(out, {
    items: [{ id: "ct1" }],
    pagination: { total: 1, page_size: 20, page_number: 1 },
  });
});
