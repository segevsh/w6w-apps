import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockOktaCtx } from "../_helpers.ts";
import newUser from "../../triggers/new-user.ts";
import updatedUser from "../../triggers/new-or-updated-user.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});
const t0 = Date.parse("2026-11-10T12:00:00Z");
const at = (ms: number) => {
  clock.now = () => ms;
};
const user = (id: string, lastUpdated = "2026-11-10T09:00:00.000Z") => ({ id, lastUpdated });
const poll = (trigger: typeof newUser, state: unknown, records: unknown[]) => {
  const mock = mockOktaCtx([{ body: records }]);
  return { mock, result: trigger.poll!({ params: {}, state, subscriptionId: "sub-1" }, mock.ctx) };
};
const search = (url: string) => {
  const u = new URL(url);
  return { origin: u.origin + u.pathname, params: Object.fromEntries(u.searchParams) };
};

test("new-user: seeds, emits only new users, retries idempotently", async () => {
  at(t0);
  const seeded = await poll(newUser, {}, [user("u1")]).result;
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  at(t0 + 300_000);
  const first = poll(newUser, seeded.nextState, [user("u2"), user("u1")]);
  const retry = poll(newUser, seeded.nextState, [user("u2"), user("u1")]);
  assertEquals((await first.result).events, [user("u2")]);
  assertEquals(await retry.result, await first.result);
});

test("new-user: GET /users with search created gt (cursor - 30 min), limit 100", async () => {
  at(t0);
  const seed = poll(newUser, {}, []);
  await seed.result;
  assertEquals(seed.mock.calls[0].method, "GET");
  assertEquals(search(seed.mock.calls[0].url), {
    origin: "https://dev-1.okta.com/api/v1/users",
    params: { search: 'created gt "2026-11-10T11:30:00.000Z"', limit: "100" },
  });
});

test("new-or-updated-user: an edit is a new event (idOf includes lastUpdated)", async () => {
  at(t0);
  const seeded = await poll(updatedUser, {}, [user("u1")]).result;
  assertEquals(seeded.events, []);
  at(t0 + 300_000);
  const edited = user("u1", "2026-11-10T12:03:00.000Z");
  const first = poll(updatedUser, seeded.nextState, [edited, user("u1")]);
  const retry = poll(updatedUser, seeded.nextState, [edited, user("u1")]);
  assertEquals((await first.result).events, [edited]);
  assertEquals(await retry.result, await first.result);
  const again = await poll(updatedUser, (await first.result).nextState, [edited]).result;
  assertEquals(again.events, []);
});

test("new-or-updated-user: GET /users with search lastUpdated gt (cursor - 30 min)", async () => {
  at(t0);
  const seed = poll(updatedUser, {}, []);
  await seed.result;
  assertEquals(search(seed.mock.calls[0].url), {
    origin: "https://dev-1.okta.com/api/v1/users",
    params: { search: 'lastUpdated gt "2026-11-10T11:30:00.000Z"', limit: "100" },
  });
});
