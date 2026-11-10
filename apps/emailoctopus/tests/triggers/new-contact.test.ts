import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";

const input = { params: { listId: "list_1" }, subscriptionId: "sub_1" };
const contact = (id: string, createdAt = "2026-11-09T12:00:00Z") => ({
  id,
  email_address: `${id}@example.com`,
  created_at: createdAt,
});

async function withClock<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => Date.parse(iso);
  try {
    return await fn();
  } finally {
    Date.now = real;
  }
}

test("new-contact: seeds, emits unseen contacts, retries idempotently, and requests the documented since filter", async () => {
  const seed = mockCtx([{ body: { data: [contact("a")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const state = {
    v: 1 as const,
    kind: "ids" as const,
    seeded: true as const,
    ids: ["a"],
    cursor: "2026-11-09T12:02:00.000Z",
  };
  const response = { body: { data: [contact("b"), contact("a")] } };
  const first = mockCtx([response]);
  const retry = mockCtx([response]);
  const result = await trigger.poll!({ ...input, state }, first.ctx);
  const repeated = await trigger.poll!({ ...input, state }, retry.ctx);
  assertEquals(result.events, [contact("b")]);
  assertEquals(repeated.events, result.events);
  assertEquals(first.calls[0].method, "GET");
  assertEquals(
    first.calls[0].url,
    "https://api.emailoctopus.com/lists/list_1/contacts?limit=100&created_at.gte=2026-11-09T12%3A00%3A00.000Z",
  );
});

test("new-contact: a burst of 101 contacts across a page token is fully emitted and the cursor advances", async () => {
  const state = {
    v: 1 as const,
    kind: "ids" as const,
    seeded: true as const,
    ids: ["old"],
    cursor: "2026-11-09T12:02:00.000Z",
  };
  const ids = Array.from({ length: 101 }, (_, i) => `c${i}`);
  const page1 = {
    body: {
      data: ids.slice(0, 100).map((id) => contact(id)),
      paging: { next: { starting_after: "tok1" } },
    },
  };
  const page2 = { body: { data: [contact(ids[100])] } };
  await withClock("2026-11-09T12:10:00Z", async () => {
    const { ctx, calls } = mockCtx([page1, page2]);
    const result = await trigger.poll!({ ...input, state }, ctx);
    assertEquals(result.events.length, 101);
    assertEquals(calls.length, 2);
    assertEquals(new URL(calls[1].url).searchParams.get("starting_after"), "tok1");
    assertEquals(
      (result.nextState as { cursor?: number }).cursor,
      Date.parse("2026-11-09T12:10:00Z"),
    );
  });
});

test("new-contact: a window of six full pages is emitted exactly once across two checks and the cursor advances after the drain", async () => {
  const state = {
    v: 1 as const,
    kind: "ids" as const,
    seeded: true as const,
    ids: ["old"],
    cursor: "2026-11-09T12:00:00.000Z",
  };
  const full = (n: number, last: boolean) => ({
    body: {
      data: Array.from({ length: 100 }, (_, i) => contact(`p${n}-${i}`)),
      ...(last ? {} : { paging: { next: { starting_after: `tok${n}` } } }),
    },
  });
  const t1 = Date.parse("2026-11-09T12:30:00Z");
  const t2 = Date.parse("2026-11-09T12:35:00Z");
  const seen: string[] = [];
  let mid: unknown;
  await withClock("2026-11-09T12:30:00Z", async () => {
    const { ctx, calls } = mockCtx([1, 2, 3, 4, 5].map((n) => full(n, false)));
    const result = await trigger.poll!({ ...input, state }, ctx);
    assertEquals(calls.length, 5);
    assertEquals(result.events.length, 500);
    seen.push(...result.events.map((e) => String((e as { id: string }).id)));
    mid = result.nextState;
    const resume = (mid as { resume?: { pos?: string } }).resume;
    assertEquals(resume?.pos, "tok5");
    assertEquals((mid as { cursor?: number }).cursor, Date.parse("2026-11-09T12:00:00Z"));
  });
  await withClock("2026-11-09T12:35:00Z", async () => {
    const { ctx, calls } = mockCtx([full(6, true)]);
    const result = await trigger.poll!({ ...input, state: mid }, ctx);
    assertEquals(calls.length, 1);
    const url = new URL(calls[0].url);
    assertEquals(url.searchParams.get("starting_after"), "tok5");
    assertEquals(url.searchParams.get("created_at.gte"), "2026-11-09T11:58:00.000Z");
    seen.push(...result.events.map((e) => String((e as { id: string }).id)));
    const next = result.nextState as { cursor?: number; resume?: unknown };
    assertEquals(next.cursor, t1);
    assertEquals(next.resume, undefined);
    assertEquals(t2 > t1, true);
  });
  assertEquals(seen.length, 600);
  assertEquals(new Set(seen).size, 600);
});

test("new-contact: seeding reads nothing, and records that predate the seed never fire, even over 6 full pages", async () => {
  const OLD = "2026-11-10T00:00:00Z";
  const NEW = "2026-11-10T00:33:00Z";
  const rec = (id: string, at: string) => contact(id, at);
  const full = (n: number, last: boolean) => ({
    body: {
      data: Array.from({ length: 100 }, (_, i) => rec(`p${n}-${i}`, OLD)),
      ...(last ? {} : { paging: { next: { starting_after: `tok${n}` } } }),
    },
  });
  let state: unknown;
  await withClock("2026-11-10T00:30:00Z", async () => {
    const { ctx, calls } = mockCtx([{ body: { data: [rec("a", OLD)] } }]);
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
    const { ctx } = mockCtx([{ body: { data: [rec("old1", OLD), rec("fresh", NEW)] } }]);
    const result = await trigger.poll!({ ...input, state }, ctx);
    assertEquals(result.events, [rec("fresh", NEW)]);
  });
});
