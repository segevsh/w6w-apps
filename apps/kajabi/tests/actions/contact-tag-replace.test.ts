import { assert, assertEquals, assertRejects } from "@std/assert";
import contactTagReplace from "../../actions/contact-tag-replace.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-tag-replace: PATCHes the full tag set", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await contactTagReplace.execute({ contactId: "9", tagIds: "1,2" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0]), "/v1/contacts/9/relationships/tags");
  assertEquals(bodyOf(calls[0]), {
    data: [
      { id: "1", type: "contact_tags" },
      { id: "2", type: "contact_tags" },
    ],
  });
});

/**
 * THE guard on this action.
 *
 * JSON:API would honour an empty array as "clear the relationship", and Kajabi
 * would strip every tag from the contact. But a blank input here is far more
 * often an unset template variable than a deliberate wipe, and the two are
 * indistinguishable on the wire. The previous tag set is unrecoverable — this
 * API has no history to restore it from — so the action refuses rather than
 * guessing, and says what to do instead.
 */
Deno.test("contact-tag-replace: refuses a blank list rather than stripping every tag", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => {
      await contactTagReplace.execute({ contactId: "9", tagIds: "" }, ctx);
    },
    Error,
  );
  assert(err.message.includes("strip every"));
  assert(err.message.includes("contact-tag-remove"), "does not point at the safe alternative");
  assertEquals(calls.length, 0, "reached the network with an empty replacement");
});

/** Its description must warn, since an operator picks actions from a list. */
Deno.test("contact-tag-replace: announces that it is destructive", () => {
  assert(/destructive/i.test(contactTagReplace.description!));
});
