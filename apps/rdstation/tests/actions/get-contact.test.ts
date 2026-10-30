import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";

import getContact from "../../actions/get-contact.ts";
import { API_ROOT, mockCtx, pathOf } from "../_helpers.ts";

test("get-contact: GET /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "c1", name: "Ada" } }]);

  const out = await getContact.execute({ contactId: "c1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/contacts/c1`);
  assertEquals(pathOf(calls[0].url), "/api/v1/contacts/c1");
  assertEquals(out, { _id: "c1", name: "Ada" });
});

test("get-contact: the id is URL-encoded, not concatenated raw", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);

  await getContact.execute({ contactId: "a b/c?d" }, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/contacts/a%20b%2Fc%3Fd`);
});

test("get-contact: declares contactId as required", () => {
  const param = getContact.params?.find((p) => p.key === "contactId");
  assertEquals(param?.required, true);
  assertEquals(getContact.type, "read");
});

test("get-contact: a 404 carries the vendor's own error message", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: { errors: { error_type: "RESOURCE_NOT_FOUND", error_message: "Contact not found" } },
    },
  ]);

  const error = await (getContact.execute({ contactId: "nope" }, ctx) as Promise<unknown>)
    .catch((e: Error) => e) as Error;

  assert(error instanceof Error);
  assert(/RESOURCE_NOT_FOUND: Contact not found/.test(error.message), error.message);
});
