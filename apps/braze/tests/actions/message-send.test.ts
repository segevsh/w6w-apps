import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send.ts";

test("message-send: posts external_user_ids and the per-channel messages payload", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { dispatch_id: "d1" } }], {
    display: { instance: "iad-01" },
  });
  await action.execute!({
    externalUserIds: ["u1", "u2"],
    messages: { email: { subject: "Hi", body: "Hello" } },
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.external_user_ids, ["u1", "u2"]);
  assertEquals(body.messages, { email: { subject: "Hi", body: "Hello" } });
});

test("message-send: defaults send_id to the invocation id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], {
    display: { instance: "iad-01" },
    invocationId: "inv-456",
  });
  await action.execute!({ segmentId: "seg1", messages: { email: {} } }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.send_id, "inv-456");
  assertEquals(body.segment_id, "seg1");
});
