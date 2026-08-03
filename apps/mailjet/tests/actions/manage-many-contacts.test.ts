import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import manageManyContacts from "../../actions/manage-many-contacts.ts";

// -------------------------------------------------------- manage-many-contacts

Deno.test("manage-many-contacts: POSTs to the list's managemanycontacts path", async () => {
  const { ctx, calls } = mockCtx([{ body: { Count: 1, Data: [{ JobID: 35800 }] } }]);
  await manageManyContacts.execute!({ listId: 42, contacts: [{ Email: "a@x.com" }] }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v3/REST/contactslist/42/managemanycontacts",
  );
});

Deno.test("manage-many-contacts: uses the LOWERCASE top-level action key", async () => {
  // Mailjet's bulk endpoint takes `action`, while the single-contact endpoint
  // takes a capitalised per-list `Action`. Getting this wrong is silently
  // rejected, so it is pinned here.
  const { ctx, calls } = mockCtx([{ body: { Data: [{ JobID: 1 }] } }]);
  await manageManyContacts.execute!(
    { listId: 1, action: "unsub", contacts: [{ Email: "a@x.com" }] },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.action, "unsub");
  assert(!("Action" in body), "the bulk endpoint takes lowercase `action`");
  assert(!("Contacts" in body), "the bulk endpoint takes lowercase `contacts`");
});

Deno.test("manage-many-contacts: defaults to addnoforce", async () => {
  const { ctx, calls } = mockCtx([{ body: { Data: [{ JobID: 1 }] } }]);
  await manageManyContacts.execute!({ listId: 1, contacts: [{ Email: "a@x.com" }] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).action, "addnoforce");
  const param = manageManyContacts.params?.find((p) => p.key === "action");
  assertEquals(param?.default, "addnoforce");
});

Deno.test("manage-many-contacts: forwards the contacts array untouched", async () => {
  const { ctx, calls } = mockCtx([{ body: { Data: [{ JobID: 1 }] } }]);
  const contacts = [
    { Email: "a@x.com", Name: "Ada", Properties: { plan: "pro" } },
    { Email: "b@x.com" },
  ];
  await manageManyContacts.execute!({ listId: 1, contacts }, ctx);
  assertEquals(JSON.parse(calls[0].body!).contacts, contacts);
});

Deno.test("manage-many-contacts: returns the JobID envelope — the import has not run", async () => {
  const { ctx } = mockCtx([{ body: { Count: 1, Data: [{ JobID: 35800 }], Total: 1 } }]);
  const result = await manageManyContacts.execute!(
    { listId: 1, contacts: [{ Email: "a@x.com" }] },
    ctx,
  ) as { Data: Array<{ JobID: number }> };
  assertEquals(result.Data[0].JobID, 35800);
});
