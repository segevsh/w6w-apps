import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-article.ts";

const input = { params: { streamId: "enterprise/acme/category/c1" }, subscriptionId: "sub_1" };
const article = (id: string) => ({ id, title: `T ${id}`, published: 1794268800000 });
const page = (...ids: string[]) => ({ body: { id: "s", items: ids.map(article) } });

async function withClock<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => Date.parse(iso);
  try {
    return await fn();
  } finally {
    Date.now = real;
  }
}

test("new-article: seeds, emits only unseen articles, retries idempotently, sends newerThan = cursor - 2 min", async () => {
  await withClock("2026-11-10T00:30:00Z", async () => {
    const seed = mockCtx([page("a")]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(
      (seeded.nextState as { cursor?: number }).cursor,
      Date.parse("2026-11-10T00:30:00Z"),
    );

    await withClock("2026-11-10T00:35:00Z", async () => {
      const first = mockCtx([page("b", "a")]);
      const retry = mockCtx([page("b", "a")]);
      const result = await trigger.poll!({
        ...input,
        state: { ...(seeded.nextState as object), ids: ["a"], floor: 0 },
      }, first.ctx);
      const repeated = await trigger.poll!({
        ...input,
        state: { ...(seeded.nextState as object), ids: ["a"], floor: 0 },
      }, retry.ctx);
      assertEquals(result.events, [article("b")]);
      assertEquals(repeated, result);

      const url = new URL(first.calls[0].url);
      assertEquals(first.calls[0].method, "GET");
      assertEquals(url.pathname, "/v3/streams/contents");
      assertEquals(Object.fromEntries(url.searchParams), {
        streamId: "enterprise/acme/category/c1",
        count: "100",
        newerThan: String(Date.parse("2026-11-10T00:28:00Z")),
      });
    });
  });
});

test("new-article: a window of six full pages is emitted exactly once across two checks and the cursor advances after the drain", async () => {
  const full = (n: number, last: boolean) => ({
    body: {
      id: "s",
      items: Array.from({ length: 100 }, (_, i) => article(`p${n}-${i}`)),
      ...(last ? {} : { continuation: `tok${n}` }),
    },
  });
  const state = {
    v: 1 as const,
    kind: "ids" as const,
    seeded: true as const,
    ids: ["old"],
    cursor: Date.parse("2026-11-10T00:00:00Z"),
  };
  const seen: string[] = [];
  let mid: unknown;
  await withClock("2026-11-10T00:30:00Z", async () => {
    const { ctx, calls } = mockCtx([1, 2, 3, 4, 5].map((n) => full(n, false)));
    const result = await trigger.poll!({ ...input, state }, ctx);
    assertEquals(calls.length, 5);
    assertEquals(new URL(calls[4].url).searchParams.get("continuation"), "tok4");
    seen.push(...result.events.map((e) => String((e as { id: string }).id)));
    mid = result.nextState;
    assertEquals((mid as { resume?: { pos?: string } }).resume?.pos, "tok5");
    assertEquals((mid as { cursor?: number }).cursor, state.cursor);
  });
  await withClock("2026-11-10T00:35:00Z", async () => {
    const { ctx, calls } = mockCtx([full(6, true)]);
    const result = await trigger.poll!({ ...input, state: mid }, ctx);
    assertEquals(calls.length, 1);
    const url = new URL(calls[0].url);
    assertEquals(url.searchParams.get("continuation"), "tok5");
    assertEquals(url.searchParams.get("newerThan"), String(Date.parse("2026-11-09T23:58:00Z")));
    seen.push(...result.events.map((e) => String((e as { id: string }).id)));
    const next = result.nextState as { cursor?: number; resume?: unknown };
    assertEquals(next.cursor, Date.parse("2026-11-10T00:30:00Z"));
    assertEquals(next.resume, undefined);
  });
  assertEquals(seen.length, 600);
  assertEquals(new Set(seen).size, 600);
});

test("new-article: seeding reads nothing, and records that predate the seed never fire, even over 6 full pages", async () => {
  const OLD = "2026-11-10T00:00:00Z";
  const NEW = "2026-11-10T00:33:00Z";
  const rec = (id: string, at: string) => ({ id, title: `T ${id}`, crawled: Date.parse(at) });
  const full = (n: number, last: boolean) => ({
    body: {
      id: "s",
      items: Array.from({ length: 100 }, (_, i) => rec(`p${n}-${i}`, OLD)),
      ...(last ? {} : { continuation: `tok${n}` }),
    },
  });
  let state: unknown;
  await withClock("2026-11-10T00:30:00Z", async () => {
    const { ctx, calls } = mockCtx([{ body: { id: "s", items: [rec("a", OLD)] } }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx);
    assertEquals(seeded.events, []);
    assertEquals(calls.length, 0);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(
      (seeded.nextState as { floor?: number }).floor,
      Date.parse("2026-11-10T00:30:00Z"),
    );
    state = seeded.nextState;
  });
  await withClock("2026-11-10T00:35:00Z", async () => {
    const { ctx, calls } = mockCtx([
      full(1, false),
      full(2, false),
      full(3, false),
      full(4, false),
      full(5, false),
    ]);
    const result = await trigger.poll!({ ...input, state }, ctx);
    assertEquals(calls.length, 5);
    assertEquals(result.events, []);
    state = result.nextState;
  });
  await withClock("2026-11-10T00:40:00Z", async () => {
    const { ctx } = mockCtx([full(6, true)]);
    const result = await trigger.poll!({ ...input, state }, ctx);
    assertEquals(result.events, []);
    state = result.nextState;
  });
  await withClock("2026-11-10T00:45:00Z", async () => {
    const { ctx } = mockCtx([{ body: { id: "s", items: [rec("old1", OLD), rec("fresh", NEW)] } }]);
    const result = await trigger.poll!({ ...input, state }, ctx);
    assertEquals(result.events, [rec("fresh", NEW)]);
  });
});
