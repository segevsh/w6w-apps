import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-suppression.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const T1 = T0 + 300_000;
const dest = (email: string) => ({
  EmailAddress: email,
  Reason: "BOUNCE",
  LastUpdateTime: "2026-11-09T11:59:00.000Z",
});
const item = (email: string) => ({
  emailAddress: email,
  reason: "BOUNCE",
  lastUpdateTime: "2026-11-09T11:59:00.000Z",
});
const page = (emails: string[], next?: string) => ({
  body: { SuppressedDestinationSummaries: emails.map(dest), ...(next ? { NextToken: next } : {}) },
});
const BASE = "https://email.us-east-1.amazonaws.com/v2/email/suppression/addresses";

async function at<T>(now: number, run: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => now;
  try {
    return await run();
  } finally {
    Date.now = real;
  }
}

test("new-suppression seeds with the since window, emits a new address, and retries identically", async () => {
  const seed = mockCtx([page(["a@x.com"])]);
  const seeded = await at(T0, () => trigger.poll!({ ...input, state: {} }, seed.ctx));
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals((seeded.nextState as { cursor?: number }).cursor, T0);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, `${BASE}?StartDate=2026-11-09T11%3A58%3A00.000Z&PageSize=100`);

  const run = () => {
    const m = mockCtx([page(["b@x.com", "a@x.com"])]);
    return at(T1, () => trigger.poll!({ ...input, state: seeded.nextState }, m.ctx)).then((r) => ({
      r,
      m,
    }));
  };
  const first = await run();
  const retry = await run();
  assertEquals(first.r.events, [item("b@x.com")]);
  assertEquals(retry.r, first.r);
  assertEquals(first.m.calls[0].url, `${BASE}?StartDate=2026-11-09T11%3A58%3A00.000Z&PageSize=100`);
  assertEquals((first.r.nextState as { cursor?: number }).cursor, T1);
});

test("new-suppression reads at most 3 pages and then keeps the cursor so nothing is skipped", async () => {
  const seeded = await at(
    T0,
    () => trigger.poll!({ ...input, state: {} }, mockCtx([page(["a@x.com"])]).ctx),
  );
  const m = mockCtx([
    page(["b@x.com"], "t1"),
    page(["c@x.com"], "t2"),
    page(["d@x.com"], "t3"),
    page(["e@x.com"]),
  ]);
  const got = await at(T1, () => trigger.poll!({ ...input, state: seeded.nextState }, m.ctx));
  assertEquals(m.calls.length, 3);
  assertEquals(
    m.calls[1].url,
    `${BASE}?StartDate=2026-11-09T11%3A58%3A00.000Z&PageSize=100&NextToken=t1`,
  );
  assertEquals(got.events.map((e) => (e as { emailAddress: string }).emailAddress).sort(), [
    "b@x.com",
    "c@x.com",
    "d@x.com",
  ]);
  assertEquals((got.nextState as { cursor?: number }).cursor, T0);
});
