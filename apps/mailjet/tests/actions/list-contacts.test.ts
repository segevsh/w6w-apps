import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import listContacts from "../../actions/list-contacts.ts";

const ENVELOPE = { body: { Count: 1, Data: [{ ID: 1, Email: "a@x.com" }], Total: 1 } };

// ---------------------------------------------------------------- list-contacts

Deno.test("list-contacts: GETs /v3/REST/contact", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await listContacts.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/REST/contact");
  assertEquals(calls[0].method, "GET");
});

Deno.test("list-contacts: sends no filters when none are supplied", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await listContacts.execute!({}, ctx);
  assertEquals([...new URL(calls[0].url).searchParams.keys()], []);
});

Deno.test("list-contacts: maps filters onto Mailjet's capitalised names", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await listContacts.execute!(
    { contactsList: 7, campaign: 9, isExcludedFromCampaigns: true, limit: 100, offset: 200 },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("ContactsList"), "7");
  assertEquals(p.get("Campaign"), "9");
  assertEquals(p.get("IsExcludedFromCampaigns"), "true");
  assertEquals(p.get("Limit"), "100");
  assertEquals(p.get("Offset"), "200");
});

Deno.test("list-contacts: isExcludedFromCampaigns=false is a real filter, not an absence", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await listContacts.execute!({ isExcludedFromCampaigns: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("IsExcludedFromCampaigns"), "false");
});
