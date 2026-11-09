import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-contact.ts";
import { mockCtx } from "../_helpers.ts";

test("new-contact: seeds, emits unseen contacts, retries idempotently, and requests newest first", async () => {
  const seedMock = mockCtx([{ body: [{ contactId: "old", email: "old@example.test" }] }]);
  const seed = await trigger.poll!({ params: {}, state: {}, subscriptionId: "sub" }, seedMock.ctx);
  assertEquals(seed.events, []);
  assertEquals(seed.nextState?.seeded, true);

  const page = [{ contactId: "new", email: "new@example.test" }, { contactId: "old" }];
  const freshMock = mockCtx([{ body: page }]);
  const fresh = await trigger.poll!(
    { params: {}, state: seed.nextState!, subscriptionId: "sub" },
    freshMock.ctx,
  );
  assertEquals(fresh.events, [page[0]]);
  const retryA = await trigger.poll!(
    { params: {}, state: seed.nextState!, subscriptionId: "sub" },
    mockCtx([{ body: page }]).ctx,
  );
  const retryB = await trigger.poll!(
    { params: {}, state: seed.nextState!, subscriptionId: "sub" },
    mockCtx([{ body: page }]).ctx,
  );
  assertEquals(retryA, retryB);
  const request = new URL(freshMock.calls[0].url);
  assertEquals([freshMock.calls[0].method, request.pathname, request.search], [
    "GET",
    "/v3/contacts",
    "?sort%5BcreatedOn%5D=DESC&page=1&perPage=100",
  ]);
});
