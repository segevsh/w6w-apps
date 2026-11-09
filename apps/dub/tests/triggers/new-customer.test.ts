import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-customer.ts";

const page = (customers: unknown[]) => ({ body: customers });

test("new-customer seeds, emits unseen customers, retries idempotently, and requests newest first", async () => {
  const params = { startingAfter: "old-page", endingBefore: "older-page" };
  const seeded = await trigger.poll!(
    { params, state: {} } as never,
    mockCtx([page([{ id: "a" }])]).ctx,
  ) as never as { events: unknown[]; nextState: unknown };
  assertEquals(seeded.events, []);
  const nextCtx = mockCtx([page([{ id: "b" }, { id: "a" }])]);
  const next = await trigger.poll!({ params, state: seeded.nextState } as never, nextCtx.ctx);
  assertEquals((next as never as { events: unknown[] }).events, [{ id: "b" }]);
  const retry = await trigger.poll!(
    { params, state: seeded.nextState } as never,
    mockCtx([page([{ id: "b" }, { id: "a" }])]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(
    nextCtx.calls[0].url,
    "https://api.dub.co/customers?sortBy=createdAt&sortOrder=desc&pageSize=100",
  );
});
