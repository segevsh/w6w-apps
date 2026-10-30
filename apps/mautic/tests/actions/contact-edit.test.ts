import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-edit.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

test("contact-edit: PATCHes /contacts/{id}/edit", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { contact: { id: 1 } } }], conn);
  await action.execute!({ contactId: 1, firstname: "Ada" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://mautic.example.com/api/contacts/1/edit");
  assertEquals(JSON.parse(calls[0].body!), { firstname: "Ada" });
});

/** `-tag` removes; a bare tag adds — both in the same call, per Mautic's docs. */
test("contact-edit: a `-` prefix on a tag is preserved for removal", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { contact: {} } }], conn);
  await action.execute!({ contactId: 1, tags: "vip,-cold" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).tags, ["vip", "-cold"]);
});

test("contact-edit: is idempotent — the same edit twice has the same effect", () => {
  assertEquals(action.idempotent, true);
});
