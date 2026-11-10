import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-envelope.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ id, title: `Doc ${id}`, status: "DRAFT" });
const page = (items: unknown[]) => ({
  body: { data: items, count: items.length, currentPage: 1, perPage: 100, totalPages: 1 },
});

test("new-envelope: seeds, emits only new envelopes, retries idempotently, requests the first page of documents", async () => {
  const seed = mockCtx([page([item("a")])]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  const url = new URL(seed.calls[0].url);
  assertEquals(url.origin + url.pathname, "https://app.documenso.com/api/v2/envelope");
  assertEquals(Object.fromEntries(url.searchParams), {
    type: "DOCUMENT",
    page: "1",
    perPage: "100",
  });

  const items = [item("b"), item("a")];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page(items)]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page(items)]).ctx,
  );
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
