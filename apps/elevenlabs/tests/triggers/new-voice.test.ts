import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-voice.ts";

const page = (voices: unknown[]) => ({ body: { voices, has_more: false } });

test("new-voice seeds, emits unseen voices, retries idempotently, and requests newest first", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} } as never,
    mockCtx([page([{ voice_id: "a" }])]).ctx,
  ) as never as { events: unknown[]; nextState: unknown };
  assertEquals(seeded.events, []);
  const nextCtx = mockCtx([page([{ voice_id: "b" }, { voice_id: "a" }])]);
  const next = await trigger.poll!({ params: {}, state: seeded.nextState } as never, nextCtx.ctx);
  assertEquals((next as never as { events: unknown[] }).events, [{ voice_id: "b" }]);
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState } as never,
    mockCtx([page([{ voice_id: "b" }, { voice_id: "a" }])]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(
    nextCtx.calls[0].url,
    "https://api.elevenlabs.io/v2/voices?page_size=100&sort=created_at_unix&sort_direction=desc",
  );
});
