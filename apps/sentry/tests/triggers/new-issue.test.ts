import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-issue.ts";
const item = (id: string) => ({ id });
test("new-issue seeds, emits, retries, and requests literal first-seen ordering", async () => {
  const seed = mockCtx([{ body: [item("a")] }], { display: { organization: "acme" } });
  const params = { organizationSlug: "acme" };
  const seeded = await trigger.poll!({ params, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://us.sentry.io/api/0/organizations/acme/issues/?sort=new&per_page=100",
  );
  const first = await trigger.poll!(
    { params, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body: [item("b"), item("a")] }], { display: { organization: "acme" } }).ctx,
  );
  const retry = await trigger.poll!(
    { params, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body: [item("b"), item("a")] }], { display: { organization: "acme" } }).ctx,
  );
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
