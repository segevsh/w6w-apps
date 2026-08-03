import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import sendFlow from "../../actions/send-flow.ts";

Deno.test("send-flow: POSTs subscriber_id and flow_ns", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await sendFlow.execute!({ subscriberId: "9876543210", flowNs: "content2026_1" }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/sending/sendFlow");
  assertEquals(JSON.parse(calls[0].body!), {
    subscriber_id: "9876543210",
    flow_ns: "content2026_1",
  });
});

Deno.test("send-flow: the subscriber id is not parsed to a number", async () => {
  // Meta-scale ids exceed 2^53; a round trip through a JS number corrupts them.
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await sendFlow.execute!({ subscriberId: "9007199254740993", flowNs: "x" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).subscriber_id, "9007199254740993");
});

Deno.test("send-flow: exposes no message tag — that parameter is not on this endpoint", () => {
  const keys = (sendFlow.params ?? []).map((p) => p.key);
  assertEquals(keys, ["subscriberId", "flowNs"]);
  assert(!keys.includes("messageTag"));
  assert(!keys.includes("otnTopicName"));
});

Deno.test("send-flow: is never idempotent — a retry sends the automation twice", () => {
  assertEquals(sendFlow.idempotent, false);
});
