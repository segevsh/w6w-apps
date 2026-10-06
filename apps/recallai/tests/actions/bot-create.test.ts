import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bot-create.ts";

Deno.test("bot-create: POSTs meeting_url and the shortcut fields, with an idempotency key", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "b1" } }]);
  const out = await action.execute!({
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    botName: "Notes",
    joinAt: "2026-10-07T10:00:00Z",
    transcriptProvider: "recallai_streaming",
    transcriptLanguage: "en_us",
    recordingConfig: '{"video_mixed_mp4":{},"retention":{"type":"timed","hours":72}}',
    extra: { automatic_leave: { waiting_room_timeout: 600 } },
    metadata: '{"deal":"123"}',
  }, { ...ctx, invocation: { invocationId: "inv-1" } } as never);
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v1/bot/");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["idempotency-key"], "inv-1");
  assertEquals(JSON.parse(calls[0].body!), {
    meeting_url: "https://meet.google.com/abc-defg-hij",
    bot_name: "Notes",
    join_at: "2026-10-07T10:00:00Z",
    automatic_leave: { waiting_room_timeout: 600 },
    recording_config: {
      transcript: { provider: { recallai_streaming: { language_code: "en_us" } } },
      video_mixed_mp4: {},
      retention: { type: "timed", hours: 72 },
    },
    metadata: { deal: "123" },
  });
  assertEquals(out, { id: "b1" });
});

Deno.test("bot-create: only meeting_url by default; recordingConfig overrides the shortcut", async () => {
  const bare = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ meetingUrl: "https://zoom.us/j/1" }, bare.ctx);
  assertEquals(JSON.parse(bare.calls[0].body!), { meeting_url: "https://zoom.us/j/1" });
  assertEquals("idempotency-key" in bare.calls[0].headers, false);

  const o = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({
    meetingUrl: "u",
    transcriptProvider: "meeting_captions",
    recordingConfig: { transcript: { provider: { assembly_ai_async_chunked: {} } } },
  }, o.ctx);
  assertEquals(JSON.parse(o.calls[0].body!).recording_config, {
    transcript: { provider: { assembly_ai_async_chunked: {} } },
  });

  const none = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ meetingUrl: "u", transcriptProvider: "none" }, none.ctx);
  assertEquals("recording_config" in JSON.parse(none.calls[0].body!), false);
  assertEquals(action.idempotent, false);
  assertEquals(action.params!.filter((p) => p.required).map((p) => p.key), ["meetingUrl"]);
});

Deno.test("bot-create: a 507 and a 400 field map are reported", async () => {
  const full = mockCtx([{
    status: 507,
    headers: { "content-type": "application/json", "retry-after": "30" },
    body: { detail: "Out of adhoc bots", code: "out_of_adhoc_bots" },
  }]);
  await assertRejects(
    async () => await action.execute!({ meetingUrl: "u" }, full.ctx),
    Error,
    "(out_of_adhoc_bots) (retry after 30s)",
  );
  const bad = mockCtx([{ status: 400, body: { meeting_url: ["Enter a valid URL."] } }]);
  await assertRejects(
    async () => await action.execute!({ meetingUrl: "nope" }, bad.ctx),
    Error,
    '{"meeting_url":["Enter a valid URL."]}',
  );
});
