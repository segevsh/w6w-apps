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
    const result = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
    const repeated = await trigger.poll!({ ...input, state: seeded.nextState }, retry.ctx);
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
