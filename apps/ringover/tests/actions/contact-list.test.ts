import { assertEquals } from "@std/assert";
import action from "../../actions/contact-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-list: GETs /contacts with search and paging", async () => {
  const { ctx, calls } = mockCtx([{
    body: { contact_list_count: 1, total_contact_count: 9, contact_list: [{ contact_id: 1 }] },
  }]);
  const out = await action.execute!({ search: "ada", limitCount: 1 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/contacts");
  assertEquals(Object.fromEntries(url.searchParams), { search: "ada", limit_count: "1" });
  assertEquals(out, { contacts: [{ contact_id: 1 }], count: 1, total: 9 });
});

Deno.test("contact-list: a 204 is an empty list", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({}, ctx), { contacts: [], count: 0, total: 0 });
});
