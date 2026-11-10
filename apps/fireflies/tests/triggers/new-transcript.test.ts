import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, sent } from "../_helpers.ts";
import trigger from "../../triggers/new-transcript.ts";

const input = { params: {}, subscriptionId: "sub_1" };
const transcript = (id: string) => ({
  id,
  title: `Meeting ${id}`,
  dateString: "2026-11-09T15:00:00.000Z",
});
const page = (...ids: string[]) => ({ body: { data: { transcripts: ids.map(transcript) } } });

async function withClock<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => Date.parse(iso);
  try {
    return await fn();
  } finally {
    Date.now = real;
  }
}

test("new-transcript: seeds, emits only unseen transcripts, retries idempotently, and posts the fromDate/limit query", async () => {
  await withClock("2026-11-10T00:30:00Z", async () => {
    const seed = mockCtx([page("a")]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

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
    assertEquals(result.events, [transcript("b")]);
    assertEquals(repeated, result);

    assertEquals(first.calls[0].method, "POST");
    assertEquals(first.calls[0].url, "https://api.fireflies.ai/graphql");
    const { query, variables } = sent(first.calls[0]);
    assertEquals(variables, { fromDate: "2026-11-08T00:30:00.000Z" });
    assertEquals(query.includes("channel_id: $channelId, limit: 50"), true);
  });
});

test("new-transcript: a window of five full pages is emitted exactly once across two checks and the cursor advances after the drain", async () => {
  const full = (n: number) => ({
    body: {
      data: { transcripts: Array.from({ length: 50 }, (_, i) => transcript(`p${n}-${i}`)) },
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
    const { ctx, calls } = mockCtx([full(1), full(2), full(3), full(4)]);
    const result = await trigger.poll!({ ...input, state }, ctx);
    assertEquals(calls.length, 4);
    assertEquals(sent(calls[3]).query.includes("skip: 150"), true);
    seen.push(...result.events.map((e) => String((e as { id: string }).id)));
    mid = result.nextState;
    assertEquals((mid as { resume?: { pos?: number } }).resume?.pos, 200);
    assertEquals((mid as { cursor?: number }).cursor, state.cursor);
  });
  await withClock("2026-11-10T00:35:00Z", async () => {
    const short = {
      body: { data: { transcripts: [transcript("last1"), transcript("last2")] } },
    };
    const { ctx, calls } = mockCtx([short]);
    const result = await trigger.poll!({ ...input, state: mid }, ctx);
    assertEquals(calls.length, 1);
    const { query, variables } = sent(calls[0]);
    assertEquals(query.includes("skip: 200"), true);
    assertEquals(variables.fromDate, "2026-11-08T00:00:00.000Z");
    seen.push(...result.events.map((e) => String((e as { id: string }).id)));
    const next = result.nextState as { cursor?: number; resume?: unknown };
    assertEquals(next.cursor, Date.parse("2026-11-10T00:30:00Z"));
    assertEquals(next.resume, undefined);
  });
  assertEquals(seen.length, 202);
  assertEquals(new Set(seen).size, 202);
});

test("new-transcript: seeding reads nothing, and records that predate the seed never fire, even over 5 full pages", async () => {
  const OLD = "2026-11-10T00:00:00Z";
  const NEW = "2026-11-10T00:33:00Z";
  const rec = (id: string, at: string) => ({ id, title: `Meeting ${id}`, dateString: at });
  const full = (n: number, _last: boolean) => ({
    body: {
      data: { transcripts: Array.from({ length: 50 }, (_, i) => rec(`p${n}-${i}`, OLD)) },
    },
  });
  let state: unknown;
  await withClock("2026-11-10T00:30:00Z", async () => {
    const { ctx, calls } = mockCtx([{ body: { data: { transcripts: [rec("a", OLD)] } } }]);
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
    ]);
    const result = await trigger.poll!({ ...input, state }, ctx);
    assertEquals(calls.length, 4);
    assertEquals(result.events, []);
    state = result.nextState;
  });
  await withClock("2026-11-10T00:40:00Z", async () => {
    const { ctx } = mockCtx([full(5, false), { body: { data: { transcripts: [] } } }]);
    const result = await trigger.poll!({ ...input, state }, ctx);
    assertEquals(result.events, []);
    state = result.nextState;
  });
  await withClock("2026-11-10T00:45:00Z", async () => {
    const { ctx } = mockCtx([{
      body: { data: { transcripts: [rec("old1", OLD), rec("fresh", NEW)] } },
    }]);
    const result = await trigger.poll!({ ...input, state }, ctx);
    assertEquals(result.events, [rec("fresh", NEW)]);
  });
});
