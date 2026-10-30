import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactOfferList from "../../actions/contact-offer-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("contact-offer-list: GETs the relationship route", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "3", type: "offers" }] } }]);
  await contactOfferList.execute({ contactId: "9" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/contacts/9/relationships/offers");
});

test("contact-offer-list: sends no pagination — the spec declares none on this route", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await contactOfferList.execute({ contactId: "9" }, ctx);
  assertEquals(queryOf(calls[0]), {});
});

test("contact-offer-list: an id with a slash is percent-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await contactOfferList.execute({ contactId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/contacts/a%2Fb/relationships/offers");
});
