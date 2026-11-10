import { test } from "node:test";
import { readFileSync } from "node:fs";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import meetingReady from "../../triggers/meeting-ready.ts";
import transcriptReady from "../../triggers/transcript-ready.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

const meetingBody = {
  id: "webhook-123",
  event: "MeetingReady",
  executedAt: "2026-11-09T10:31:00Z",
  data: {
    id: "meeting-123",
    name: "Team Standup Meeting",
    happenedAt: "2026-11-09T10:00:00Z",
    url: "https://app.tldv.io/meetings/meeting-123",
    duration: 1800,
    organizer: { name: "Ada Lovelace", email: "ada@example.com" },
    invitees: [{ name: "Grace Hopper", email: "grace@example.com" }],
    metadata: { crmRecordId: "rec_123" },
    notes: { markdownContent: "## Summary" },
    transcript: { id: "transcript-123", meetingId: "meeting-123", data: [] },
  },
};

const transcriptBody = {
  id: "webhook-456",
  event: "TranscriptReady",
  executedAt: "2026-11-09T10:32:00Z",
  data: {
    id: "meeting-123",
    meetingId: "meeting-123",
    data: {
      transcript: "Hello everyone.",
      segments: [{ startTime: 0, endTime: 5, text: "Hello everyone." }],
    },
  },
};

const call = (body: unknown, method = "POST") => ({
  raw: { method, path: "/", query: {}, headers: {} as Record<string, string>, body },
  params: {},
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

test("app declares the two webhook triggers with output and sample, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key), ["meeting-ready", "transcript-ready"]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
    assertEquals(typeof t.handleIngest, "function");
    // unsigned vendor: no secret param, no invented signature
    assert(!(t.params ?? []).some((p) => p.type === "secret"));
  }
});

test("manual receiver: onSubscribe hands back the callback URL and calls nothing; onUnsubscribe is a no-op", async () => {
  for (const t of [meetingReady, transcriptReady]) {
    const { ctx, calls } = mockCtx([]);
    const state = await t.onSubscribe!(
      { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
      ctx,
    );
    assertEquals(state, { callbackUrl: CALLBACK });
    await t.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
    assertEquals(calls.length, 0);
  }
});

test("a MeetingReady delivery is parsed into one event", async () => {
  const out = evs(await meetingReady.handleIngest!(call(meetingBody), mockCtx().ctx)) as Array<
    Record<string, unknown>
  >;
  assertEquals(out.length, 1);
  assertEquals(out[0].deliveryId, "webhook-123");
  assertEquals(out[0].event, "MeetingReady");
  assertEquals(out[0].meetingId, "meeting-123");
  assertEquals(out[0].name, "Team Standup Meeting");
  assertEquals(out[0].duration, 1800);
  assertEquals(out[0].organizer, { name: "Ada Lovelace", email: "ada@example.com" });
  assertEquals(out[0].metadata, { crmRecordId: "rec_123" });
  assertEquals((out[0].transcript as { id: string }).id, "transcript-123");
  assertEquals(out[0].data, meetingBody.data);
});

test("a TranscriptReady delivery is parsed into one event", async () => {
  const out = evs(
    await transcriptReady.handleIngest!(call(transcriptBody), mockCtx().ctx),
  ) as Array<
    Record<string, unknown>
  >;
  assertEquals(out.length, 1);
  assertEquals(out[0].event, "TranscriptReady");
  assertEquals(out[0].meetingId, "meeting-123");
  assertEquals(out[0].transcript, "Hello everyone.");
  assertEquals(out[0].segments, [{ startTime: 0, endTime: 5, text: "Hello everyone." }]);
});

test("the other tl;dv event on the same URL is acknowledged without a run", async () => {
  assertEquals(evs(await meetingReady.handleIngest!(call(transcriptBody), mockCtx().ctx)), []);
  assertEquals(evs(await transcriptReady.handleIngest!(call(meetingBody), mockCtx().ctx)), []);
});

test("a JSON string body is parsed; a body that is not a tl;dv delivery or a non-POST method is refused", async () => {
  const out = evs(
    await meetingReady.handleIngest!(call(JSON.stringify(meetingBody)), mockCtx().ctx),
  );
  assertEquals(out.length, 1);
  for (const body of [null, "not json", [1, 2], 7, {}, { event: "MeetingReady" }, { data: {} }]) {
    await assertRejects(async () => await meetingReady.handleIngest!(call(body), mockCtx().ctx));
  }
  await assertRejects(async () =>
    await meetingReady.handleIngest!(call(meetingBody, "GET"), mockCtx().ctx)
  );
});

test("README states the URL-is-the-secret trust model", () => {
  const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
  assert(/## Triggers/.test(readme));
  assert(/callback URL is the secret/i.test(readme));
});
