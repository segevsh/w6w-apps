import { test } from "node:test";
import { assertEquals } from "../_assert.ts";

import listContacts from "../../actions/list-contacts.ts";
import { API_ROOT, envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("list-contacts: GET /contacts against crm.rdstation.com", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("contacts", [{ _id: "c1" }]) }]);

  await listContacts.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith(`${API_ROOT}/contacts`), true, calls[0].url);
  assertEquals(pathOf(calls[0].url), "/api/v1/contacts");
});

test("list-contacts: sends the documented filter names, not the param keys", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("contacts", []) }]);

  await listContacts.execute(
    {
      page: 2,
      limit: 50,
      order: "created_at",
      direction: "desc",
      email: "ada@example.com",
      q: "Ada",
      phone: "+5511999990000",
      title: "CTO",
    },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    page: "2",
    limit: "50",
    order: "created_at",
    direction: "desc",
    email: "ada@example.com",
    q: "Ada",
    phone: "+5511999990000",
    title: "CTO",
  });
});

test("list-contacts: an unset filter is omitted, never sent blank", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("contacts", []) }]);

  await listContacts.execute({ q: "" }, ctx);

  assertEquals(queryOf(calls[0].url), {});
});

test("list-contacts: returns the vendor's envelope verbatim", async () => {
  const payload = { contacts: [{ _id: "c1" }], has_more: true, total: 1204 };
  const { ctx } = mockCtx([{ body: payload }]);

  const out = await listContacts.execute({}, ctx);

  assertEquals(out, payload);
});

test("list-contacts: pre-fills the documented default and caps the limit at 200", () => {
  const limit = listContacts.params?.find((p) => p.key === "limit");
  assertEquals(limit?.default, 20);
  assertEquals(limit?.validation?.max, 200);
  assertEquals(listContacts.type, "search");
});
