import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockDiscourseCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-topic.ts";

const page = (topics: unknown[]) => ({ body: { topic_list: { topics } } });

test("new-topic seeds, emits unseen topics, retries idempotently, and requests newest first", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} } as never,
    mockDiscourseCtx([page([{ id: 1 }])]).ctx,
  ) as never as { events: unknown[]; nextState: unknown };
  assertEquals(seeded.events, []);
  const nextCtx = mockDiscourseCtx([page([{ id: 2 }, { id: 1 }])]);
  const next = await trigger.poll!({ params: {}, state: seeded.nextState } as never, nextCtx.ctx);
  assertEquals((next as never as { events: unknown[] }).events, [{ id: 2 }]);
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState } as never,
    mockDiscourseCtx([page([{ id: 2 }, { id: 1 }])]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(
    nextCtx.calls[0].url,
    "https://forum.example.com/latest.json?order=created&ascending=false&per_page=100",
  );
});
