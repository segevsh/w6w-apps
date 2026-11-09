import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-sms.ts";

const envelope = (rows: unknown[]) => ({
  body: { http_code: 200, response_code: "SUCCESS", data: { data: rows } },
});
test("new-sms seeds, emits once, retries idempotently, and requests newest history", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} },
    mockCtx([envelope([{ message_id: "a" }])]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const page = envelope([{ message_id: "b" }, { message_id: "a" }]);
  const first = mockCtx([page]);
  const emitted = await trigger.poll!({ params: {}, state: seeded.nextState }, first.ctx);
  assertEquals(emitted.events, [{ message_id: "b" }]);
  assertEquals({
    method: first.calls[0].method,
    path: new URL(first.calls[0].url).pathname,
    query: Object.fromEntries(new URL(first.calls[0].url).searchParams),
  }, {
    method: "GET",
    path: "/v3/sms/history",
    query: { order_by: "date:desc", page: "1", limit: "100" },
  });
  assertEquals(
    await trigger.poll!({ params: {}, state: seeded.nextState }, mockCtx([page]).ctx),
    emitted,
  );
});
