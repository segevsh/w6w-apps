import { assert, assertEquals, assertRejects } from "@std/assert";
import contactOfferRevoke from "../../actions/contact-offer-revoke.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-offer-revoke: DELETEs the offers via the relationship route", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await contactOfferRevoke.execute({ contactId: "9", offerIds: "4" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0]), "/v1/contacts/9/relationships/offers");
  assertEquals(bodyOf(calls[0]), { data: [{ id: "4", type: "offers" }] });
});

Deno.test("contact-offer-revoke: a blank offer list fails before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await contactOfferRevoke.execute({ contactId: "9", offerIds: "" }, ctx);
    },
    Error,
    "at least one offer id",
  );
  assertEquals(calls.length, 0);
});

/**
 * Revoking access does not stop billing. The description has to say so — doing
 * only this to a paying member leaves them charged for something they can no
 * longer open.
 */
Deno.test("contact-offer-revoke: points at the subscription action in its description", () => {
  assert(contactOfferRevoke.description!.includes("purchase-cancel-subscription"));
});
