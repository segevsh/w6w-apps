import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import manageContactLists from "../../actions/manage-contact-lists.ts";

// -------------------------------------------------------- manage-contact-lists

Deno.test("manage-contact-lists: POSTs the ContactsLists array with capitalised Action", async () => {
  const { ctx, calls } = mockCtx([{ body: { Count: 1, Data: [] } }]);
  await manageContactLists.execute!({ contact: "1", listId: 42, action: "unsub" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/REST/contact/1/managecontactslists");
  assertEquals(JSON.parse(calls[0].body!), {
    ContactsLists: [{ ListID: 42, Action: "unsub" }],
  });
});

Deno.test("manage-contact-lists: defaults to addnoforce, which respects an unsubscribe", async () => {
  // addforce would silently resurrect an opt-out; that must never be a default.
  const { ctx, calls } = mockCtx([{ body: { Data: [] } }]);
  await manageContactLists.execute!({ contact: "1", listId: 42 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).ContactsLists[0].Action, "addnoforce");
  const param = manageContactLists.params?.find((p) => p.key === "action");
  assertEquals(param?.default, "addnoforce");
});

Deno.test("manage-contact-lists: an explicit contactsLists array takes precedence", async () => {
  const { ctx, calls } = mockCtx([{ body: { Data: [] } }]);
  await manageContactLists.execute!({
    contact: "a@x.com",
    listId: 1,
    action: "addforce",
    contactsLists: [{ ListID: 5, Action: "remove" }, { ListID: 6, Action: "addnoforce" }],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).ContactsLists, [
    { ListID: 5, Action: "remove" },
    { ListID: 6, Action: "addnoforce" },
  ]);
});

Deno.test("manage-contact-lists: offers all four Mailjet verbs", () => {
  const param = manageContactLists.params?.find((p) => p.key === "action");
  const values = (param?.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values.sort(), ["addforce", "addnoforce", "remove", "unsub"]);
});
