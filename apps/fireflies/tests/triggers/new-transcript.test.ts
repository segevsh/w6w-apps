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
