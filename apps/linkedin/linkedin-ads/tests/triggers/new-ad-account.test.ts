import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-ad-account.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const account = (id: number) => ({ id, name: `Account ${id}`, status: "ACTIVE" });
const page = (accounts: unknown[], nextPageToken?: string) => ({
  elements: accounts,
  metadata: nextPageToken === undefined ? {} : { nextPageToken },
});

const run = async (state: unknown, pages: unknown[][]) => {
  const mock = mockCtx(pages.map((accounts, i) => ({
    body: page(accounts, i < pages.length - 1 ? `tok-${i + 1}` : undefined),
  })));
  const result = await trigger.poll!({ ...input, state }, mock.ctx);
  return { result, calls: mock.calls };
};

test("new-ad-account: the first check seeds the collection without emitting", async () => {
  const { result } = await run({}, [[account(1)]]);
  assertEquals(result.events, []);
  assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
});

test("new-ad-account: an account added after seeding is emitted once, and a retry repeats it identically", async () => {
  const seeded = (await run({}, [[account(1)]])).result.nextState;
  const first = await run(seeded, [[account(2), account(1)]]);
  const retry = await run(seeded, [[account(2), account(1)]]);
  assertEquals(first.result.events, [account(2)]);
  assertEquals(retry.result, first.result);
});

test("new-ad-account: an account on the second page is found, and each page is requested with its token", async () => {
  const seeded = (await run({}, [[account(1)], [account(2)]])).result.nextState;
  const next = await run(seeded, [[account(1)], [account(2), account(3)]]);
  assertEquals(next.result.events, [account(3)]);
  assertEquals(
    next.calls.map((c) => ({ method: c.method, url: c.url })),
    [
      { method: "GET", url: "https://api.linkedin.com/rest/adAccounts?q=search&pageSize=100" },
      {
        method: "GET",
        url: "https://api.linkedin.com/rest/adAccounts?q=search&pageSize=100&pageToken=tok-1",
      },
    ],
  );
});
