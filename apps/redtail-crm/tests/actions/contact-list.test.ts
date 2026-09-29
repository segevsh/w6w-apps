import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-list: fetches GET /contacts?page=N with pagesize/include headers", async () => {
  const { ctx, calls } = mockCtx([{
    body: { contacts: [{ id: 1 }], meta: { total_records: 1, total_pages: 1 } },
  }]);
  const out = await contactList.execute({ page: 2, pagesize: 25, include: "addresses" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/public/v1/contacts");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(calls[0].headers["pagesize"], "25");
  assertEquals(calls[0].headers["include"], "addresses");
  assertEquals(out.contacts.length, 1);
  assertEquals(out.meta?.total_records, 1);
});

Deno.test("contact-list: omits unset headers entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await contactList.execute({}, ctx);
  assertEquals(calls[0].headers["pagesize"], undefined);
  assertEquals(calls[0].headers["include"], undefined);
});

Deno.test("contact-list: is a search action", () => {
  assertEquals(contactList.type, "search");
});
