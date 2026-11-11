import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import memberJoined from "../../triggers/member-joined.ts";
import postCreated from "../../triggers/post-created.ts";
import networkEvent from "../../triggers/network-event.ts";

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
  over: { headers?: Record<string, string>; method?: string } = {},
  key: string | null = KEY,
  events?: string,
) => ({
  raw: {
    method: over.method ?? "POST",
    path: "/",
    query: {},
    headers: over.headers ?? { authorization: `Bearer ${KEY}` },
    body: rawBody === null ? null : JSON.parse(rawBody),
    ...(rawBody === null ? {} : { rawBody }),
  },
  params: { webhookKey: (key ?? undefined) as string, events },
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

type Trig = typeof memberJoined | typeof networkEvent;
const ingest = (t: Trig, input: ReturnType<typeof call>) =>
  t.handleIngest!(input as never, mockCtx().ctx);

async function refused(fn: () => Promise<unknown>, includes: string) {
  try {
    await fn();
  } catch (err) {
    assert(err instanceof Error && err.message.includes(includes), `message: ${String(err)}`);
    return;
  }
  throw new Error("expected the delivery to be refused");
}

test("fixture body has non-canonical whitespace", () => {
  const b = bodyFor("MemberJoined");
  assert(JSON.stringify(JSON.parse(b)) !== b);
});

test("the original three webhook triggers keep their keys, output, sample and handler, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key).slice(0, 3), [
    "member-joined",
    "post-created",
    "network-event",
  ]);
  for (const t of app.triggers.slice(0, 3)) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.handleIngest, "function");
  }
});

test("manual webhook: onSubscribe makes no vendor call and returns the callback URL", async () => {
  const m = mockCtx([]);
  const state = await memberJoined.onSubscribe!(
    { params: { webhookKey: KEY }, callbackUrl: CALLBACK, subscriptionId: "sub_1" } as never,
    m.ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  assertEquals(m.calls.length, 0);
});

test("valid bearer token → one event, both event_type spellings", async () => {
  const out = evs(await ingest(memberJoined, call(bodyFor("MemberJoined")))) as Array<
    Record<string, unknown>
  >;
  assertEquals(out.length, 1);
  assertEquals(out[0].eventId, "evt-1");
  assertEquals(out[0].eventType, "MemberJoined");
  assertEquals(out[0].payload, { id: 12345, title: "Hello" });
  const hook = evs(await ingest(postCreated, call(bodyFor("PostCreatedHook")))) as unknown[];
  assertEquals(hook.length, 1);
});

test("an event of another type is acknowledged with no event", async () => {
  assertEquals(evs(await ingest(memberJoined, call(bodyFor("PostCreated")))), []);
});

test("generic trigger: passes everything, or only the listed events", async () => {
  assertEquals(
    (evs(await ingest(networkEvent, call(bodyFor("RsvpCreated")))) as unknown[]).length,
    1,
  );
  assertEquals(
    evs(await ingest(networkEvent, call(bodyFor("RsvpCreated"), {}, KEY, "PostCreated"))),
    [],
  );
  assertEquals(
    (evs(
      await ingest(networkEvent, call(bodyFor("PostCreated"), {}, KEY, "PostCreated,Foo")),
    ) as unknown[])
      .length,
    1,
  );
  assertEquals((evs(await ingest(networkEvent, call(bodyFor(null)))) as unknown[]).length, 1);
});

test("a specific trigger refuses a delivery with no event_type", async () => {
  await refused(() => ingest(memberJoined, call(bodyFor(null))), "event_type");
});

test("wrong bearer token, one flipped byte → refused", async () => {
  const flipped = KEY.slice(0, -1) + (KEY.endsWith("9") ? "8" : "9");
  await refused(
    () =>
      ingest(
        memberJoined,
        call(bodyFor("MemberJoined"), { headers: { authorization: `Bearer ${flipped}` } }),
      ),
    "does not match",
  );
});

test("authorization header missing or not a bearer token → refused", async () => {
  await refused(
    () => ingest(memberJoined, call(bodyFor("MemberJoined"), { headers: {} })),
    "missing",
  );
  await refused(
    () =>
      ingest(
        memberJoined,
        call(bodyFor("MemberJoined"), { headers: { authorization: `Basic ${KEY}` } }),
      ),
    "missing",
  );
});

test("rawBody absent → refused", async () => {
  await refused(() => ingest(memberJoined, call(null)), "raw body");
});

test("unset or empty webhook key → refused, even with an empty bearer token", async () => {
  for (const key of [null, ""]) {
    await refused(() => ingest(memberJoined, call(bodyFor("MemberJoined"), {}, key)), "secret");
    await refused(
      () =>
        ingest(
          memberJoined,
          call(bodyFor("MemberJoined"), { headers: { authorization: "Bearer " } }, key),
        ),
      "secret",
    );
  }
});

test("a non-POST request and a malformed body are refused", async () => {
  await refused(
    () => ingest(memberJoined, call(bodyFor("MemberJoined"), { method: "GET" })),
    "POST",
  );
  await refused(() => ingest(memberJoined, call("[1,2]")), "Not a Mighty Networks");
});

test("errors never contain the key or the token", async () => {
  const bad = `${KEY}-wrong`;
  try {
    await ingest(
      memberJoined,
      call(bodyFor("MemberJoined"), { headers: { authorization: `Bearer ${bad}` } }),
    );
    throw new Error("should have thrown");
  } catch (err) {
    const m = (err as Error).message;
    assert(!m.includes(KEY) && !m.includes(bad));
  }
});
