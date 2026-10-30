import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import createContact from "../../actions/create-contact.ts";

const ENVELOPE = { body: { Count: 1, Data: [{ ID: 1, Email: "a@x.com" }], Total: 1 } };

// --------------------------------------------------------------- create-contact

test("create-contact: POSTs Email with Mailjet's capitalisation", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await createContact.execute!({ email: "a@x.com" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/REST/contact");
  assertEquals(JSON.parse(calls[0].body!), { Email: "a@x.com" });
});

test("create-contact: omits Name and the exclusion flag when unset", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await createContact.execute!({ email: "a@x.com", name: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { Email: "a@x.com" });
});

test("create-contact: forwards IsExcludedFromCampaigns=false rather than dropping it", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await createContact.execute!(
    { email: "a@x.com", name: "Ada", isExcludedFromCampaigns: false },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    Email: "a@x.com",
    Name: "Ada",
    IsExcludedFromCampaigns: false,
  });
});
