import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newCampaign from "../../triggers/new-campaign.ts";
import newCustomFeed from "../../triggers/new-custom-feed.ts";
import newTag from "../../triggers/new-tag.ts";
import newList from "../../triggers/new-list.ts";
import newListItem from "../../triggers/new-list-item.ts";

const BASE = "https://api.leadfeeder.com/v1";
const rec = (id: string) => ({ id, type: "thing", attributes: { name: `n${id}` } });
const paged = (items: unknown[], pagination: Record<string, unknown> = {}) => ({
  data: items,
  meta: { request_id: "r1", pagination: { page_num: 1, page_count: 1, ...pagination } },
});
// The client percent-encodes `page[size]`; the literals below are the decoded vendor syntax.
const decoded = (url: string) => decodeURIComponent(url);

// Table-driven: every new trigger shares one case set; each request URL is a literal.
const specs = [
  {
    name: "new-campaign",
    trigger: newCampaign,
    params: { accountId: "A1" },
    url: `${BASE}/campaigns?account_id=A1&page[size]=100`,
  },
  {
    name: "new-custom-feed",
    trigger: newCustomFeed,
    params: { accountId: "A1" },
    // custom-feed-list takes no paging parameters (the vendor returns the whole set).
    url: `${BASE}/web-visits/custom-feeds?account_id=A1`,
  },
  {
    name: "new-tag",
    trigger: newTag,
    params: { accountId: "A1" },
    url: `${BASE}/tags?account_id=A1&page[size]=100`,
  },
  {
    name: "new-list",
    trigger: newList,
    params: { accountId: "A1", scope: "contact" },
    url: `${BASE}/lists?account_id=A1&filter[scope]=contact&page[size]=100`,
  },
  {
    name: "new-list-item",
    trigger: newListItem,
    params: { accountId: "A1", listId: "company_123" },
    url: `${BASE}/lists/company_123/items?account_id=A1&page[size]=100`,
  },
];

for (const { name, trigger, params, url } of specs) {
  const input = { params, subscriptionId: "sub-1" };
  const ctx = (items: unknown[]) => mockCtx([{ status: 200, body: paged(items) }]);

  test(`${name}: seeds without emitting, emits only the new item, retries idempotently`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([rec("1")]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [rec("2"), rec("1")];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [rec("2")]);
    assertEquals(retry, first);
  });

  test(`${name}: sends the list action's literal request`, async () => {
    const seed = ctx([rec("1")]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(decoded(seed.calls[0].url), url);
  });
}

test("page-numbered snapshot triggers follow every page", async () => {
  const input = { params: { accountId: "A1" }, subscriptionId: "sub-1" };
  const two = (a: unknown[], b: unknown[]) => [
    { body: paged(a, { page_num: 1, page_count: 2 }) },
    { body: paged(b, { page_num: 2, page_count: 2 }) },
  ];
  const seeded = await newTag.poll!(
    { ...input, state: {} },
    mockCtx(two([rec("1"), rec("2")], [rec("3")])).ctx,
  );
  assertEquals(seeded.events, []);
  const mock = mockCtx(two([rec("1"), rec("2")], [rec("3"), rec("4")]));
  const next = await newTag.poll!({ ...input, state: seeded.nextState }, mock.ctx);
  assertEquals(next.events, [rec("4")]);
  assertEquals(mock.calls.map((c) => decodeURIComponent(c.url)), [
    `${BASE}/tags?account_id=A1&page[size]=100`,
    `${BASE}/tags?account_id=A1&page[num]=2&page[size]=100`,
  ]);
});

test("new-list-item follows the cursor through every page", async () => {
  const input = { params: { accountId: "A1", listId: "company_123" }, subscriptionId: "sub-1" };
  const seeded = await newListItem.poll!(
    { ...input, state: {} },
    mockCtx([
      { body: paged([rec("1")], { next_cursor: "abc" }) },
      { body: paged([rec("2")]) },
    ]).ctx,
  );
  assertEquals(seeded.events, []);
  const mock = mockCtx([
    { body: paged([rec("1")], { next_cursor: "abc" }) },
    { body: paged([rec("2"), rec("3")]) },
  ]);
  const next = await newListItem.poll!({ ...input, state: seeded.nextState }, mock.ctx);
  assertEquals(next.events, [rec("3")]);
  assertEquals(mock.calls.map((c) => decodeURIComponent(c.url)), [
    `${BASE}/lists/company_123/items?account_id=A1&page[size]=100`,
    `${BASE}/lists/company_123/items?account_id=A1&page[cursor]=abc&page[size]=100`,
  ]);
});
