import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newPage from "../../triggers/new-page.ts";
import newDomain from "../../triggers/new-domain.ts";
import newSubAccount from "../../triggers/new-sub-account.ts";
import newPageGroup from "../../triggers/new-page-group.ts";
import newAccount from "../../triggers/new-account.ts";

const API = "https://api.unbounce.com";
const cases = [
  {
    name: "new-page",
    trigger: newPage,
    params: {},
    listKey: "pages",
    url: `${API}/pages?sort_order=desc&limit=100`,
  },
  {
    name: "new-domain",
    trigger: newDomain,
    params: { subAccountId: "77" },
    listKey: "domains",
    url: `${API}/sub_accounts/77/domains?sort_order=desc&limit=100`,
  },
  {
    name: "new-sub-account",
    trigger: newSubAccount,
    params: { accountId: "55" },
    listKey: "sub_accounts",
    url: `${API}/accounts/55/sub_accounts?sort_order=desc&limit=100`,
  },
  {
    name: "new-page-group",
    trigger: newPageGroup,
    params: { subAccountId: "77" },
    listKey: "page_groups",
    url: `${API}/sub_accounts/77/page_groups?sort_order=desc&limit=100`,
  },
  {
    name: "new-account",
    trigger: newAccount,
    params: {},
    listKey: "accounts",
    url: `${API}/accounts?sort_order=desc`,
  },
];

for (const c of cases) {
  test(`${c.name}: seeds, emits only the new record, retries idempotently, requests newest first`, async () => {
    const page1 = { [c.listKey]: [{ id: "1", name: "one" }] };
    const page2 = { [c.listKey]: [{ id: "2", name: "two" }, { id: "1", name: "one" }] };

    const seed = mockCtx([{ body: page1 }]);
    const baseline = await c.trigger.poll!({ params: c.params, state: {} }, seed.ctx);
    assertEquals(baseline.events, []);
    assertEquals(baseline.nextState.seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);

    const a = mockCtx([{ body: page2 }]);
    const b = mockCtx([{ body: page2 }]);
    const one = await c.trigger.poll!({ params: c.params, state: baseline.nextState }, a.ctx);
    const retry = await c.trigger.poll!({ params: c.params, state: baseline.nextState }, b.ctx);
    assertEquals(one.events, [{ id: "2", name: "two" }]);
    assertEquals(one, retry);
    assertEquals(a.calls[0].url, c.url);
  });
}
