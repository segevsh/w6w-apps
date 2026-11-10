import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { connected, mockCtx } from "../_helpers.ts";
import newSubscription from "../../triggers/new-subscription.ts";
import newActivity from "../../triggers/new-activity.ts";
import newArticle from "../../triggers/new-article.ts";
import newEmailSubscriber from "../../triggers/new-email-subscriber.ts";
import newTransaction from "../../triggers/new-transaction.ts";

const cases = [
  {
    trigger: newSubscription,
    params: {},
    url: "https://acme.outseta.com/api/v1/billing/subscriptions?limit=100&orderBy=Created+DESC",
  },
  {
    trigger: newActivity,
    params: { entityType: "2" },
    url: "https://acme.outseta.com/api/v1/activities?limit=100&orderBy=Created+DESC&EntityType=2",
  },
  {
    trigger: newArticle,
    params: {},
    url: "https://acme.outseta.com/api/v1/support/articles?limit=100&orderBy=Created+DESC",
  },
  {
    trigger: newEmailSubscriber,
    params: { emailListUid: "wZmNZm2O" },
    url:
      "https://acme.outseta.com/api/v1/email/lists/wZmNZm2O/subscriptions?limit=100&orderBy=Created+DESC",
  },
  {
    trigger: newTransaction,
    params: { accountUid: "acc1" },
    url: "https://acme.outseta.com/api/v1/billing/transactions/acc1?limit=100&orderBy=Created+DESC",
  },
];

const item = (id: string) => ({ Uid: id });
const ctx = (items: unknown[]) => {
  const m = mockCtx([{ body: { metadata: {}, items } }]);
  return { ...m, ctx: connected(m.ctx) };
};

for (const c of cases) {
  test(`${c.trigger.key}: seeds, emits only unseen items, retries idempotently, literal newest-first request`, async () => {
    const input = { params: c.params, subscriptionId: "sub-1" };
    const seed = ctx([item("a")]);
    const seeded = await c.trigger.poll!({ ...input, state: {} } as never, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);
    const page = [item("b"), item("a")];
    const first = await c.trigger.poll!(
      { ...input, state: seeded.nextState } as never,
      ctx(page).ctx,
    );
    const retry = await c.trigger.poll!(
      { ...input, state: seeded.nextState } as never,
      ctx(page).ctx,
    );
    assertEquals(first.events, [item("b")]);
    assertEquals(retry, first);
  });
}
