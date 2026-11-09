import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import type { ActionDefinition, HookContext } from "@w6w/types";
import {
  pollFromListAction,
  pollNewItems,
  pollSnapshot,
  pollToken,
} from "../apps/_shared/poll/mod.ts";

type Item = { id: string };
const it = (...ids: string[]): Item[] => ids.map((id) => ({ id }));

/** Pages are newest-first; page tokens are "1", "2"... */
function pager(pages: Item[][]) {
  const calls: Array<string | undefined> = [];
  return {
    calls,
    fetchPage(token?: string) {
      calls.push(token);
      const i = token === undefined ? 0 : Number(token);
      return Promise.resolve({
        items: pages[i] ?? [],
        nextPageToken: i + 1 < pages.length ? String(i + 1) : undefined,
      });
    },
  };
}
const idOf = (i: Item) => i.id;
const SEEDED = { v: 1, kind: "ids", seeded: true, ids: ["a"] };

Deno.test("ids: unseeded state seeds page 1 without emitting", async () => {
  for (
    const state of [{}, undefined, null, "x", {
      v: 1,
      kind: "token",
      seeded: true,
    }]
  ) {
    const p = pager([it("c", "b", "a"), it("z")]);
    const r = await pollNewItems({ state, fetchPage: p.fetchPage, idOf });
    assertEquals(r.events, []);
    assertEquals(r.nextState, {
      v: 1,
      kind: "ids",
      seeded: true,
      ids: ["a", "b", "c"],
    });
    assertEquals(p.calls, [undefined]);
  }
});

Deno.test("ids: emits unseen items oldest-first and records them", async () => {
  const p = pager([it("c", "b", "a")]);
  const r = await pollNewItems({ state: SEEDED, fetchPage: p.fetchPage, idOf });
  assertEquals(r.events, it("b", "c"));
  assertEquals(r.nextState.ids, ["a", "b", "c"]);
});

Deno.test("ids: retry with the same (state, pages) is idempotent", async () => {
  const run = () =>
    pollNewItems({
      state: SEEDED,
      fetchPage: pager([it("c", "b", "a")]).fetchPage,
      idOf,
    });
  assertEquals(await run(), await run());
});

Deno.test("ids: fetchPage is called at most maxPages times", async () => {
  const p = pager([it("e"), it("d"), it("c"), it("b"), it("a")]);
  await pollNewItems({
    state: SEEDED,
    fetchPage: p.fetchPage,
    idOf,
    maxPages: 2,
  });
  assertEquals(p.calls.length, 2);
  const q = pager([it("e"), it("d"), it("c"), it("b"), it("a")]);
  await pollNewItems({ state: SEEDED, fetchPage: q.fetchPage, idOf });
  assertEquals(q.calls.length, 3); // default maxPages
});

Deno.test("ids: stops at the first page holding a seen id", async () => {
  const p = pager([it("d", "c"), it("b", "a"), it("z"), it("y")]);
  const r = await pollNewItems({
    state: SEEDED,
    fetchPage: p.fetchPage,
    idOf,
    maxPages: 4,
  });
  assertEquals(p.calls.length, 2);
  assertEquals(r.events, it("b", "c", "d"));
});

Deno.test("ids: maxEvents emits the OLDEST and the unemitted ids are absent from nextState", async () => {
  const p = pager([it("e", "d", "c", "b", "a")]);
  const r = await pollNewItems({
    state: SEEDED,
    fetchPage: p.fetchPage,
    idOf,
    maxEvents: 2,
  });
  assertEquals(r.events, it("b", "c"));
  assertEquals(r.nextState.ids, ["a", "b", "c"]);
  assert(!r.nextState.ids.includes("d") && !r.nextState.ids.includes("e"));
  // next check picks the rest up
  const r2 = await pollNewItems({
    state: r.nextState,
    fetchPage: pager([it("e", "d", "c", "b", "a")]).fetchPage,
    idOf,
    maxEvents: 2,
  });
  assertEquals(r2.events, it("d", "e"));
});

Deno.test("ids: the seen window is capped at 200 FIFO", async () => {
  const many = Array.from({ length: 250 }, (_, i) => `i${i}`);
  const seeded = await pollNewItems({
    state: {},
    fetchPage: () => Promise.resolve({ items: it(...[...many].reverse()) }),
    idOf,
  });
  assertEquals(seeded.nextState.ids.length, 200);
  assertEquals(seeded.nextState.ids[0], "i50"); // oldest 50 dropped
  assertEquals(seeded.nextState.ids[199], "i249");
  const next = await pollNewItems({
    state: seeded.nextState,
    fetchPage: () => Promise.resolve({ items: it("new", "i249") }),
    idOf,
  });
  assertEquals(next.nextState.ids.length, 200);
  assertEquals(next.nextState.ids[0], "i51");
  assertEquals(next.nextState.ids[199], "new");
});

Deno.test("token: unseeded seeds the token without events", async () => {
  let changed = false;
  const r = await pollToken<number>({
    state: {},
    seed: () => Promise.resolve("t0"),
    changes: () => {
      changed = true;
      return Promise.resolve({ items: [1], nextToken: "t1" });
    },
  });
  assertEquals(r, {
    events: [],
    nextState: { v: 1, kind: "token", seeded: true, token: "t0" },
  });
  assert(!changed);
});

Deno.test("token: seeded emits the changes and advances the token", async () => {
  const r = await pollToken<number>({
    state: { v: 1, kind: "token", seeded: true, token: "t0" },
    seed: () => Promise.reject(new Error("no")),
    changes: (t) => Promise.resolve({ items: [1, 2], nextToken: t + "+" }),
  });
  assertEquals(r.events, [1, 2]);
  assertEquals(r.nextState.token, "t0+");
});

Deno.test("token: expiry reseeds with no events", async () => {
  const r = await pollToken<number>({
    state: { v: 1, kind: "token", seeded: true, token: "old" },
    seed: () => Promise.resolve("fresh"),
    changes: () => Promise.reject(new Error("410 gone")),
    isExpired: (e) => String(e).includes("410"),
  });
  assertEquals(r.events, []);
  assertEquals(r.nextState.token, "fresh");
});

Deno.test("token: a non-expiry throw propagates", async () => {
  await assertRejects(
    () =>
      pollToken<number>({
        state: { v: 1, kind: "token", seeded: true, token: "old" },
        seed: () => Promise.resolve("fresh"),
        changes: () => Promise.reject(new Error("500 boom")),
        isExpired: (e) => String(e).includes("410"),
      }),
    Error,
    "500 boom",
  );
});

const row = (key: string, values: unknown) => ({ key, values });

Deno.test("snapshot: unseeded stores hashes without emitting", async () => {
  const r = await pollSnapshot({
    state: {},
    rows: [row("1", { a: 1 }), row("2", { a: 2 })],
  });
  assertEquals(r.events, []);
  assertEquals(Object.keys(r.nextState.hashes), ["1", "2"]);
});

Deno.test("snapshot: added, updated and removed (removed only on opt-in)", async () => {
  const seed = await pollSnapshot({
    state: {},
    rows: [row("1", { a: 1 }), row("2", { a: 2 })],
  });
  const rows = [row("2", { a: 99 }), row("3", { a: 3 })];
  const def = await pollSnapshot({ state: seed.nextState, rows });
  assertEquals(def.events, [
    { change: "updated", key: "2", values: { a: 99 } },
    { change: "added", key: "3", values: { a: 3 } },
  ]);
  const all = await pollSnapshot({
    state: seed.nextState,
    rows,
    emit: { removed: true },
  });
  assertEquals(all.events.map((e) => `${e.change}:${e.key}`), [
    "updated:2",
    "added:3",
    "removed:1",
  ]);
  const only = await pollSnapshot({
    state: seed.nextState,
    rows,
    emit: { added: false, updated: false, removed: true },
  });
  assertEquals(only.events.map((e) => e.key), ["1"]);
});

Deno.test("snapshot: key order inside a row does not read as an update", async () => {
  const seed = await pollSnapshot({
    state: {},
    rows: [row("1", { a: 1, b: 2 })],
  });
  const r = await pollSnapshot({
    state: seed.nextState,
    rows: [row("1", { b: 2, a: 1 })],
  });
  assertEquals(r.events, []);
});

Deno.test("snapshot: nextState holds hashes only, no row values", async () => {
  const r = await pollSnapshot({
    state: {},
    rows: [row("1", { secret: "hunter2-cell-value" })],
  });
  assert(!JSON.stringify(r.nextState).includes("hunter2"));
  assertEquals(r.nextState.hashes["1"].length, 12);
  assert(/^[0-9a-f]{12}$/.test(r.nextState.hashes["1"]));
});

Deno.test("snapshot: more than maxRows throws naming the cap", async () => {
  await assertRejects(
    () =>
      pollSnapshot({
        state: {},
        rows: [row("1", 1), row("2", 2), row("3", 3)],
        maxRows: 2,
      }),
    Error,
    "2-row cap",
  );
  const big = Array.from({ length: 5001 }, (_, i) => row(String(i), i));
  await assertRejects(
    () => pollSnapshot({ state: {}, rows: big }),
    Error,
    "5000-row cap",
  );
});

const ctx = {} as HookContext;
function action(
  type: ActionDefinition["type"],
  seen: unknown[],
): ActionDefinition {
  return {
    key: "list-things",
    title: "List",
    type,
    params: [],
    execute: (input: Record<string, unknown>) => {
      seen.push(input);
      return { data: [{ id: "c" }, { id: "b" }, { id: "a" }] };
    },
  } as unknown as ActionDefinition;
}
const spec = (a: ActionDefinition) => ({
  key: "new-thing",
  title: "New thing",
  description: "d",
  action: a,
  input: (p: { q: string }) => ({ query: p.q, limit: 3 }),
  items: (r: unknown) => (r as { data: unknown[] }).data,
  idOf: (i: unknown) => (i as Item).id,
  output: [],
  sample: {},
});

Deno.test("fromListAction: throws at definition time for a perform action", () => {
  assertThrows(
    () => pollFromListAction(spec(action("perform", []))),
    Error,
    "perform",
  );
  assertThrows(() => pollFromListAction(spec(action("control", []))), Error);
  pollFromListAction(spec(action("read", [])));
  pollFromListAction(spec(action("search", [])));
});

Deno.test("fromListAction: calls execute with the literal input the spec built", async () => {
  const seen: unknown[] = [];
  const t = pollFromListAction(spec(action("read", seen)));
  assertEquals(t.minIntervalMs, 300_000);
  const params = { q: "hello" };
  const seed = await t.poll!({ params, state: {}, subscriptionId: "s" }, ctx);
  assertEquals(seen, [{ query: "hello", limit: 3 }]);
  assertEquals(seed.events, []);
  const state = { ...(seed.nextState as object), ids: ["a"] };
  const r = await t.poll!({ params, state, subscriptionId: "s" }, ctx);
  assertEquals(r.events, [{ id: "b" }, { id: "c" }]);
});

Deno.test("fromListAction: nextPageInput drives paging up to maxPages", async () => {
  const seen: Array<Record<string, unknown>> = [];
  const a = {
    key: "l",
    title: "L",
    type: "search",
    execute: (input: Record<string, unknown>) => {
      seen.push(input);
      return { data: [{ id: `p${input.page}` }], more: true };
    },
  } as unknown as ActionDefinition;
  const t = pollFromListAction({
    ...spec(a),
    maxPages: 2,
    nextPageInput: (i: Record<string, unknown>, r: unknown) =>
      (r as { more: boolean }).more
        ? { ...i, page: Number(i.page ?? 1) + 1 }
        : undefined,
  });
  await t.poll!({
    params: { q: "x" },
    state: { v: 1, kind: "ids", seeded: true, ids: [] },
    subscriptionId: "s",
  }, ctx);
  assertEquals(seen.length, 2);
  assertEquals(seen[1].page, 2);
});
