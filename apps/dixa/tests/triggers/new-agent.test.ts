import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-agent.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ id, email: `${id}@example.com`, name: `Agent ${id}` });
const page = (items: unknown[], next?: string) => ({
  status: 200,
  body: { data: items, ...(next ? { meta: { next: `/v1/agents?pageKey=${next}` } } : {}) },
});

test("new-agent: seeds, emits only new agents, retries idempotently, lists /v1/agents", async () => {
  const seed = mockCtx([page([item("a")])]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  const url = new URL(seed.calls[0].url);
  assertEquals(url.pathname, "/v1/agents");
  assertEquals(Object.fromEntries(url.searchParams), { pageLimit: "100" });

  const responses = () => [page([item("a")], "k2"), page([item("b")])];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx(responses()).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx(responses()).ctx,
  );
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
