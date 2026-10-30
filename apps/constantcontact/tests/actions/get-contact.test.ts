import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-contact.ts";

test("get-contact: GETs /v3/contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact_id: "c1" } }]);
  const out = await action.execute!({ contactId: "c1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/contacts/c1");
  assertEquals(out, { contact_id: "c1" });
});

test("get-contact: url-encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ contactId: "a/b c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/contacts/a%2Fb%20c");
});

test("get-contact: forwards include only when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute!({ contactId: "c1", include: "taggings" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("include"), "taggings");
  await action.execute!({ contactId: "c1" }, ctx);
  assert(!new URL(calls[1].url).searchParams.has("include"));
});
