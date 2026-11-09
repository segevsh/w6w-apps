import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-run.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };
const page = (data: unknown[]) => ({
  body: { data, extra: { pagination: { count: data.length } } },
});

test("new-run seeds, emits unseen runs, retries idempotently, and requests newest first", async () => {
  const params = { returnAll: true };
  const seedCtx = mockCtx([page([{ id: 1, status: 10 }])], { display });
  const seeded = await trigger.poll!({ params, state: {} } as never, seedCtx.ctx) as never as {
    events: unknown[];
    nextState: { seeded: boolean };
  };
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const nextCtx = mockCtx([page([{ id: 2, status: 10 }, { id: 1, status: 10 }])], { display });
  const next = await trigger.poll!(
    { params, state: seeded.nextState } as never,
    nextCtx.ctx,
  ) as never as { events: Array<{ id: number }> };
  assertEquals(next.events, [{ id: 2, status: 10, statusName: "Success" }]);
  const retry = await trigger.poll!(
    { params, state: seeded.nextState } as never,
    mockCtx([page([{ id: 2, status: 10 }, { id: 1, status: 10 }])], { display }).ctx,
  );
  assertEquals(retry, next);
  assertEquals({
    path: new URL(nextCtx.calls[0].url).pathname,
    orderBy: new URL(nextCtx.calls[0].url).searchParams.get("order_by"),
  }, { path: "/api/v2/accounts/42/runs/", orderBy: "-id" });
});
