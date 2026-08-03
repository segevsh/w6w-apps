import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import updateContact from "../../actions/update-contact.ts";

const ENVELOPE = { body: { Count: 1, Data: [{ ID: 1, Email: "a@x.com" }], Total: 1 } };

// --------------------------------------------------------------- update-contact

Deno.test("update-contact: PUTs to the identified contact", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await updateContact.execute!({ contact: "1234", name: "Ada" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/v3/REST/contact/1234");
  assertEquals(JSON.parse(calls[0].body!), { Name: "Ada" });
});

Deno.test("update-contact: never sends Email — the address is immutable", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await updateContact.execute!({ contact: "a@x.com", name: "Ada" }, ctx);
  assert(!("Email" in JSON.parse(calls[0].body!)));
});

Deno.test("update-contact: omitted fields are absent, relying on Mailjet's PATCH-like PUT", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await updateContact.execute!({ contact: "1", isExcludedFromCampaigns: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { IsExcludedFromCampaigns: true });
});
