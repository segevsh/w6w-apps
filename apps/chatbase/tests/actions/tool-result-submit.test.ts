import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import toolResultSubmit from "../../actions/tool-result-submit.ts";
import { mockCtx, pathOf, wrapped } from "../_helpers.ts";

test("tool-result-submit: POST .../tool-result with parsed JSON output", async () => {
  const { ctx, calls } = mockCtx([{ body: wrapped({ success: true }) }]);
  const out = await toolResultSubmit.execute(
    { agentId: "a1", conversationId: "c1", toolCallId: "call_1", output: '{"status":"ok"}' },
    ctx,
  ) as { success: boolean };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/conversations/c1/tool-result");
  assertEquals(JSON.parse(calls[0].body!), { toolCallId: "call_1", output: { status: "ok" } });
  assertEquals(out.success, true);
});

test("tool-result-submit: omitted output is not sent as {} — the field is dropped entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: wrapped({ success: true }) }]);
  await toolResultSubmit.execute(
    { agentId: "a1", conversationId: "c1", toolCallId: "call_1" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { toolCallId: "call_1" });
});

test("tool-result-submit: accepts an already-parsed object, not just a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: wrapped({ success: true }) }]);
  await toolResultSubmit.execute(
    { agentId: "a1", conversationId: "c1", toolCallId: "call_1", output: { done: true } },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { toolCallId: "call_1", output: { done: true } });
});
