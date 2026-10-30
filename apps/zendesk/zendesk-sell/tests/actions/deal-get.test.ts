import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import dealGet from "../../actions/deal-get.ts";
import { dataEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("deal-get: plain fetch when includes is not requested", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1 }) }]);
  await dealGet.execute({ id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/deals/1");
  assertEquals(queryOf(calls[0].url), {});
});

test("deal-get: adds ?includes=associated_contacts when requested", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1 }) }]);
  await dealGet.execute({ id: 1, includeAssociatedContacts: true }, ctx);
  assertEquals(queryOf(calls[0].url), { includes: "associated_contacts" });
});
