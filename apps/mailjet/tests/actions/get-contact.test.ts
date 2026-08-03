import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import getContact from "../../actions/get-contact.ts";

const ENVELOPE = { body: { Count: 1, Data: [{ ID: 1, Email: "a@x.com" }], Total: 1 } };

// ------------------------------------------------------------------ get-contact

Deno.test("get-contact: accepts a numeric ID", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await getContact.execute!({ contact: "1234" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/REST/contact/1234");
});

Deno.test("get-contact: accepts an email address and percent-encodes it", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await getContact.execute!({ contact: "a+tag@x.com" }, ctx);
  // The `+` must be escaped or Mailjet reads it as a space.
  assert(calls[0].url.endsWith("/v3/REST/contact/a%2Btag%40x.com"), calls[0].url);
});
