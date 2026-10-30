import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

test("contact-delete: DELETEs /contacts/{id}/delete once confirmed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { contact: { id: 1 } } }], conn);
  const out = await action.execute!({ contactId: 1, confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://mautic.example.com/api/contacts/1/delete");
  assertEquals(out, { id: 1, deleted: true });
});

test("contact-delete: refuses without confirm=true, before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(
    async () => await action.execute!({ contactId: 1, confirm: false }, ctx),
    Error,
  );
  assert(err.message.includes("confirm"), err.message);
  assertEquals(calls.length, 0);
});

test("contact-delete: confirm is a required param", () => {
  const confirm = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assertEquals(confirm?.required, true);
});
