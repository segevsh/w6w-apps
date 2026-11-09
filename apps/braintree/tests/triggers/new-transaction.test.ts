import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-transaction.ts";

const response = (...ids: string[]) => ({
  body: {
    data: {
      transactions: {
        edges: ids.map((id) => ({ node: { id } })),
        pageInfo: { hasNextPage: false },
      },
    },
  },
});

async function at<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => new Date(iso).getTime();
  try {
    return await fn();
  } finally {
    Date.now = real;
  }
}

test("new-transaction seeds, emits, retries, and searches createdAt >= cursor - 120 s", async () => {
  const seed = await at(
    "2026-11-09T00:00:00Z",
    () => trigger.poll!({ params: {}, state: {} }, mockCtx([response("a")]).ctx),
  );
  assertEquals(seed.events, []);
  assertEquals((seed.nextState as { seeded: boolean }).seeded, true);
  const run = async () => {
    const c = mockCtx([response("b", "a")]);
    const r = await at(
      "2026-11-09T00:05:00Z",
      () => trigger.poll!({ params: {}, state: seed.nextState }, c.ctx),
    );
    return { r, c };
  };
  const first = await run();
  assertEquals(first.r.events, [{ id: "b" }]);
  assertEquals((await run()).r, first.r);
  const call = first.c.calls[0];
  assertEquals(call.url, "https://payments.braintree-api.com/graphql");
  assertEquals(call.method, "POST");
  assertEquals(JSON.parse(call.body!).variables, {
    input: { createdAt: { greaterThanOrEqualTo: "2026-11-08T23:58:00.000Z" } },
    first: 100,
  });
});
