import { assertEquals, assertRejects } from "@std/assert";
import contactOfferGrant from "../../actions/contact-offer-grant.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-offer-grant: POSTs the offers to the relationship route", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await contactOfferGrant.execute({ contactId: "9", offerIds: "4,5" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/v1/contacts/9/relationships/offers");
  assertEquals(bodyOf(calls[0]), {
    data: [
      { id: "4", type: "offers" },
      { id: "5", type: "offers" },
    ],
  });
});

/**
 * The flag lives on the request document's `meta`, beside `data` rather than
 * inside it — an unusual placement worth pinning, since guessing it into
 * `attributes` would make it silently inert.
 */
Deno.test("contact-offer-grant: the welcome-email flag goes in meta, not attributes", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await contactOfferGrant.execute(
    { contactId: "9", offerIds: "4", sendWelcomeEmail: true },
    ctx,
  );
  assertEquals(bodyOf(calls[0]).meta, { send_customer_welcome_email: true });
});

Deno.test("contact-offer-grant: an explicit false is sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await contactOfferGrant.execute(
    { contactId: "9", offerIds: "4", sendWelcomeEmail: false },
    ctx,
  );
  assertEquals(bodyOf(calls[0]).meta, { send_customer_welcome_email: false });
});

/**
 * This call causes real email to real people. An untouched checkbox must mean
 * "Kajabi decides", not "false" — so no `meta` is sent at all.
 */
Deno.test("contact-offer-grant: an unset flag sends no meta, deferring to Kajabi", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await contactOfferGrant.execute({ contactId: "9", offerIds: "4" }, ctx);
  assertEquals("meta" in bodyOf(calls[0]), false);
});

Deno.test("contact-offer-grant: a blank offer list fails before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await contactOfferGrant.execute({ contactId: "9", offerIds: " " }, ctx);
    },
    Error,
    "at least one offer id",
  );
  assertEquals(calls.length, 0);
});
