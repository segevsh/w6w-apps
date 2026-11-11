import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const KEY = "test-webhook-key-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const bodyFor = (type: string | null) =>
  `{ "event_id" : "evt-1",  "event_timestamp":"2026-11-10T10:30:00Z",
  ${type === null ? "" : `"event_type": "${type}",`}
  "payload" : { "id": 12345,  "title":"Hello" } }`;

const call = (
  rawBody: string | null,
  over: { headers?: Record<string, string> } = {},
  key: string | null = KEY,
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: over.headers ?? { authorization: `Bearer ${KEY}` },
    body: rawBody === null ? null : JSON.parse(rawBody),
    ...(rawBody === null ? {} : { rawBody }),
  },
  params: { webhookKey: (key ?? undefined) as string },
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

type Trig = (typeof app.triggers)[number];
const byKey = (k: string): Trig => {
  const t = app.triggers.find((x) => x.key === k);
  if (!t) throw new Error(`no trigger ${k}`);
  return t;
};
const ingest = (t: Trig, input: ReturnType<typeof call>) =>
  t.handleIngest!(input as never, mockCtx().ctx);

async function refused(fn: () => Promise<unknown> | unknown, includes: string) {
  try {
    await fn();
  } catch (err) {
    assert(err instanceof Error && err.message.includes(includes), `message: ${String(err)}`);
    return;
  }
  throw new Error("expected the delivery to be refused");
}

/** [trigger key, the vendor event name it fires on (Mighty Networks webhooks spec, 2026-11-10)] */
const NAMED: Array<[string, string]> = [
  ["member-left", "MemberLeft"],
  ["member-updated", "MemberUpdated"],
  ["member-purchased", "MemberPurchased"],
  ["member-subscription-canceled", "MemberSubscriptionCanceled"],
  ["member-tag-added", "MemberTagAdded"],
  ["member-tag-removed", "MemberTagRemoved"],
  ["member-lesson-completed", "MemberLessonCompleted"],
  ["post-updated", "PostUpdated"],
  ["comment-created", "CommentCreated"],
  ["event-created", "EventCreated"],
  ["event-updated", "EventUpdated"],
  ["event-canceled", "EventCanceled"],
  ["rsvp-created", "RsvpCreated"],
  ["invite-requested", "InviteRequested"],
];

test("fixture body has non-canonical whitespace", () => {
  const b = bodyFor("MemberLeft");
  assert(JSON.stringify(JSON.parse(b)) !== b);
});

test("the app lists 3 + 14 webhook triggers and 4 polls, in order, with output and sample", () => {
  assertEquals(
    app.triggers.map((t) => t.key).sort(),
    [
      "member-joined",
      "post-created",
      "network-event",
      ...NAMED.map(([k]) => k),
      "new-coursework",
      "new-plan",
      "new-space",
      "new-tag",
    ].sort(),
  );
  assertEquals(app.triggers.length, 21);
  for (const t of app.triggers) {
    assert(t.output!.length > 0, t.key);
    assert(t.sample !== undefined, t.key);
  }
  for (const [k] of NAMED) {
    const t = byKey(k);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.handleIngest, "function");
  }
});

for (const [key, evt] of NAMED) {
  test(`${key}: manual webhook, ${evt} → one event; another type → none; spelling with Hook suffix accepted`, async () => {
    const t = byKey(key);
    const m = mockCtx([]);
    assertEquals(
      await t.onSubscribe!(
        { params: { webhookKey: KEY }, callbackUrl: CALLBACK, subscriptionId: "sub_1" } as never,
        m.ctx,
      ),
      { callbackUrl: CALLBACK },
    );
    assertEquals(m.calls.length, 0);

    const out = evs(await ingest(t, call(bodyFor(evt)))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].eventType, evt);
    assertEquals(out[0].eventId, "evt-1");
    assertEquals(out[0].payload, { id: 12345, title: "Hello" });
    assertEquals((evs(await ingest(t, call(bodyFor(`${evt}Hook`)))) as unknown[]).length, 1);
    assertEquals(evs(await ingest(t, call(bodyFor("SomethingElse")))), []);
    await refused(() => ingest(t, call(bodyFor(null))), "event_type");
  });

  test(`${key}: one flipped byte of the key, missing header, no rawBody, unset key → refused`, async () => {
    const t = byKey(key);
    const body = bodyFor(evt);
    const flipped = KEY.slice(0, -1) + (KEY.endsWith("9") ? "8" : "9");
    await refused(
      () => ingest(t, call(body, { headers: { authorization: `Bearer ${flipped}` } })),
      "does not match",
    );
    await refused(() => ingest(t, call(body, { headers: {} })), "missing");
    await refused(() => ingest(t, call(null)), "raw body");
    for (const k of [null, ""]) {
      await refused(
        () => ingest(t, call(body, { headers: { authorization: "Bearer " } }, k)),
        "secret",
      );
    }
  });
}
