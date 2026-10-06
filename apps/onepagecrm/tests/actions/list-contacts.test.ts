import { assert, assertEquals, assertRejects } from "@std/assert";
import listContacts from "../../actions/list-contacts.ts";
import { errorBody, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-contacts: GET /contacts with mapped filters, paging and no credential", async () => {
  const { ctx, calls } = mockCtx([{
    body: listEnvelope("contacts", [{ contact: { id: "c1", last_name: "Lovelace" } }]),
  }]);
  const out = await listContacts.execute({
    search: "Ada",
    statusId: "s1",
    ownerId: "u1",
    starred: false,
    fields: "calls(all),notes(all)",
    sortBy: "last_name",
    order: "desc",
    page: 2,
    perPage: 50,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/contacts");
  assertEquals(queryOf(calls[0].url), {
    search: "Ada",
    status_id: "s1",
    owner_id: "u1",
    starred: "false",
    fields: "calls(all),notes(all)",
    sort_by: "last_name",
    order: "desc",
    page: "2",
    per_page: "50",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals((out.items as unknown[]).length, 1);
  assertEquals([out.totalCount, out.page, out.perPage, out.maxPage], [1, 1, 10, 1]);
});

Deno.test("list-contacts: no filters sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("contacts", []) }]);
  const out = await listContacts.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.onepagecrm.com/api/v3/contacts");
  assertEquals(out.items, []);
});

Deno.test("list-contacts: a vendor error surfaces error_name and message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("invalid_request_data", "bad filter") }]);
  const err = await assertRejects(() => Promise.resolve(listContacts.execute({}, ctx)), Error);
  assert(err.message.includes("invalid_request_data") && err.message.includes("bad filter"));
});
