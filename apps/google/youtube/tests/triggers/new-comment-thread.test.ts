import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-comment-thread.ts";

const params = { channelId: "channel-1" };
const A = { id: "thread-a" };
const B = { id: "thread-b" };
const ctxFor = (items: unknown[]) => {
  const r = [{ body: { items } }];
  return mockCtx(r);
};
const poll = (state: unknown, items: unknown[]) => {
  const c = ctxFor(items);
  return trigger.poll!({ params, state, subscriptionId: "s" }, c.ctx).then((result) => ({
    result,
    calls: c.calls,
  }));
};
const seedState = async () => (await poll({}, [A])).result.nextState;

test("new-comment-thread seeds the first check without emitting", async () => {
  const { result } = await poll({}, [B, A]);
  assertEquals(result.events, []);
  assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
});

test("new-comment-thread emits exactly the new item from the seeded state", async () => {
  const state = await seedState();
  const { result } = await poll(state, [B, A]);
  assertEquals(result.events, [B]);
});

test("new-comment-thread returns identical results when a check is retried with the same state and responses", async () => {
  const state = await seedState();
  const first = await poll(state, [B, A]);
  const second = await poll(state, [B, A]);
  assertEquals(second.result, first.result);
  assertEquals(
    second.calls.map((c) => [c.method, c.url, c.body]),
    first.calls.map((c) => [c.method, c.url, c.body]),
  );
});

test("new-comment-thread requests time order for all threads of the channel", async () => {
  const state = await seedState();
  const { calls } = await poll(state, [A]);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://youtube.googleapis.com/youtube/v3/commentThreads?part=snippet&allThreadsRelatedToChannelId=channel-1&maxResults=100&order=time",
  );
});
