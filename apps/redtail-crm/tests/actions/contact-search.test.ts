import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactSearch from "../../actions/contact-search.ts";
import { mockCtx } from "../_helpers.ts";

test("contact-search: fetches GET /contacts/search with the docs' documented parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { contacts: [{ id: 9222, company_name: "Abernathy Inc" }] },
  }]);
  const out = await contactSearch.execute({
    lastName: "Smith",
    type: "individual",
    email: "a@b.com",
    updatedSince: "2026-01-01T00:00:00Z",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/public/v1/contacts/search");
  assertEquals(url.searchParams.get("last_name"), "Smith");
  assertEquals(url.searchParams.get("type"), "individual");
  assertEquals(url.searchParams.get("email"), "a@b.com");
  assertEquals(url.searchParams.get("updated_since"), "2026-01-01T00:00:00Z");
  assertEquals(out.contacts[0].company_name, "Abernathy Inc");
});

test("contact-search: omits unset filters entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await contactSearch.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

test("contact-search: sends page and returns the response meta only when present", async () => {
  const { ctx, calls } = mockCtx([{
    body: { contacts: [], meta: { total_records: 120, total_pages: 3 } },
  }]);
  const out = await contactSearch.execute({ page: 2 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("page"), "2");
  assertEquals(out.meta, { total_records: 120, total_pages: 3 });
  const bare = await contactSearch.execute({}, mockCtx([{ body: { contacts: [] } }]).ctx);
  assertEquals("meta" in bare, false);
});
