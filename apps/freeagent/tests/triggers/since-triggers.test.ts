import { afterEach, describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newTimeslip from "../../triggers/new-timeslip.ts";
import newExpense from "../../triggers/new-expense.ts";
import newBankTransaction from "../../triggers/new-bank-transaction.ts";

const API = "https://api.freeagent.com/v2";
const T0 = Date.parse("2026-11-10T12:00:00Z"); // the seed
const T1 = T0 + 10 * 60_000; // a later check
const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const cases = [
  { trigger: newTimeslip, res: "timeslips", params: {}, path: "timeslips" },
  { trigger: newExpense, res: "expenses", params: {}, path: "expenses" },
  {
    trigger: newBankTransaction,
    res: "bank_transactions",
    params: { bankAccountId: "7" },
    path: "bank_transactions",
    extra: "bank_account=https%3A%2F%2Fapi.freeagent.com%2Fv2%2Fbank_accounts%2F7&",
  },
];

for (const c of cases) {
  describe(c.trigger.key, () => {
    const input = (state: unknown) => ({
      params: c.params,
      subscriptionId: "sub-1",
      state,
    });
    const row = (id: number, createdMs: number) => ({
      url: `${API}/${c.res}/${id}`,
      created_at: new Date(createdMs).toISOString(),
    });
    const pageOf = (from: number, n: number, createdMs: number) =>
      Array.from({ length: n }, (_, i) => row(from + i, createdMs));
    const respond = (rows: unknown[]) => ({ body: { [c.res]: rows } });
    const seed = async () => {
      clock.now = () => T0;
      const m = mockCtx([]);
      const out = await c.trigger.poll!(input({}), m.ctx);
      return { out, m };
    };

    test("the seed emits nothing, reads nothing and stores the floor", async () => {
      const { out, m } = await seed();
      assertEquals(out.events, []);
      assertEquals(m.calls.length, 0);
      const st = out.nextState as { seeded: boolean; floor: number; cursor: number };
      assertEquals([st.seeded, st.floor, st.cursor], [true, T0, T0]);
    });

    test("sends the literal request: updated_since = cursor - 120 s, first page of 100", async () => {
      const { out } = await seed();
      clock.now = () => T1;
      const m = mockCtx([respond([])]);
      await c.trigger.poll!(input(out.nextState), m.ctx);
      assertEquals(m.calls.length, 1);
      assertEquals(m.calls[0].method, "GET");
      assertEquals(
        m.calls[0].url,
        `${API}/${c.path}?${
          c.extra ?? ""
        }updated_since=2026-11-10T11%3A58%3A00.000Z&page=1&per_page=100`,
      );
    });

    test("emits a record created after the seed once, and not again on a retry", async () => {
      const { out } = await seed();
      clock.now = () => T1;
      const fresh = row(900, T0 + 60_000);
      const run = (state: unknown) =>
        c.trigger.poll!(input(state), mockCtx([respond([fresh])]).ctx);
      const first = await run(out.nextState);
      assertEquals(first.events, [fresh]);
      assertEquals((first.nextState as { cursor: number }).cursor, T1);
      assertEquals(await run(out.nextState), first);
      const again = await run(first.nextState);
      assertEquals(again.events, []);
    });

    test("9.9: records older than the seed are never emitted, however many pages hold them", async () => {
      const { out } = await seed();
      clock.now = () => T1;
      const old = (from: number, n: number) => respond(pageOf(from, n, T0 - 86_400_000));
      const m = mockCtx([old(1, 100), old(101, 100), old(201, 100)]);
      const checked = await c.trigger.poll!(input(out.nextState), m.ctx);
      assertEquals(checked.events, []);
      // The window is longer than 3 pages, so a resume position is stored; drain it.
      const m2 = mockCtx([old(301, 40)]);
      const drained = await c.trigger.poll!(input(checked.nextState), m2.ctx);
      assertEquals(drained.events, []);
      // Then a record created after the seed is the only event.
      const fresh = row(901, T0 + 120_000);
      const m3 = mockCtx([respond([fresh])]);
      const last = await c.trigger.poll!(input(drained.nextState), m3.ctx);
      assertEquals(last.events, [fresh]);
    });

    test("9.8: a window longer than 3 pages resumes where it stopped, none twice, then advances", async () => {
      const { out } = await seed();
      clock.now = () => T1;
      const born = T0 + 30_000;
      const m = mockCtx([
        respond(pageOf(1, 100, born)),
        respond(pageOf(101, 100, born)),
        respond(pageOf(201, 100, born)),
      ]);
      const first = await c.trigger.poll!(input(out.nextState), m.ctx);
      assertEquals(first.events.length, 300);
      const st1 = first.nextState as { cursor: number; resume?: { page: number; since: string } };
      assertEquals(st1.cursor, T0); // not advanced: the window is not drained
      assertEquals(st1.resume?.page, 4);
      assertEquals(st1.resume?.since, "2026-11-10T11:58:00.000Z");

      clock.now = () => T1 + 300_000;
      const m2 = mockCtx([respond([...pageOf(1, 5, born), ...pageOf(301, 20, born)])]);
      const second = await c.trigger.poll!(input(first.nextState), m2.ctx);
      // Resumes at page 4 with the SAME since; ids 1-5 were already emitted.
      assertEquals(
        m2.calls[0].url,
        `${API}/${c.path}?${
          c.extra ?? ""
        }updated_since=2026-11-10T11%3A58%3A00.000Z&page=4&per_page=100`,
      );
      assertEquals(
        second.events.map((e) => (e as { url: string }).url),
        pageOf(301, 20, born).map((r) => r.url),
      );
      const st2 = second.nextState as { cursor: number; resume?: unknown };
      assertEquals(st2.cursor, T1); // advanced to the first resumed check's start
      assertEquals(st2.resume, undefined);
    });
  });
}
