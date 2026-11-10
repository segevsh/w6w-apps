import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-secret";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

type Trigger = (typeof app.triggers)[number];
const byKey = (key: string): Trigger => app.triggers.find((t) => t.key === key)!;

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const body = (webhookEvent: string) =>
  `{ "timestamp" : 1762769400000,  "webhookEvent":"${webhookEvent}",\n "issue_event_type_name": "issue_created",\n "user": {"accountId":"u1"}, "issue" : {"id":"10001","key":"ENG-42"}, "comment":{"id":"c1"}, "project":{"key":"ENG"} }`;
const sign = (b: string, secret = SECRET) =>
  "sha256=" + createHmac("sha256", secret).update(b).digest("hex");

function input(b: string | undefined, over: {
  headers?: Record<string, string>;
  secret?: string | undefined;
  params?: Record<string, unknown>;
  method?: string;
} = {}) {
  const headers = over.headers ??
    (b === undefined
      ? {}
      : { "x-hub-signature": sign(b), "x-atlassian-webhook-identifier": "id-1" });
  return {
    raw: {
      method: over.method ?? "POST",
      path: "/",
      query: {},
      headers,
      body: b === undefined ? null : JSON.parse(b),
      ...(b === undefined ? {} : { rawBody: b }),
    },
    params: { ...(over.params ?? {}), signingSecret: "secret" in over ? over.secret : SECRET },
    state: { callbackUrl: CALLBACK },
    subscriptionId: "sub_1",
  };
}
const ingest = (key: string, i: ReturnType<typeof input>) =>
  byKey(key).handleIngest!(i as never, mockCtx().ctx);

const NAMED: Array<[string, string]> = [
  ["issue-created", "jira:issue_created"],
  ["issue-updated", "jira:issue_updated"],
  ["issue-deleted", "jira:issue_deleted"],
  ["comment-created", "comment_created"],
  ["comment-updated", "comment_updated"],
  ["comment-deleted", "comment_deleted"],
  ["project-created", "project_created"],
  ["project-updated", "project_updated"],
  ["project-deleted", "project_deleted"],
  ["user-created", "user_created"],
  ["user-updated", "user_updated"],
  ["user-deleted", "user_deleted"],
];

test("app declares the poll trigger, twelve named webhooks and Any Event", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "new-issue",
    ...NAMED.map(([k]) => k),
    "any-event",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0, `${t.key} output`);
    assert(t.sample !== undefined, `${t.key} sample`);
  }
  for (const [key] of NAMED) {
    const t = byKey(key);
    assertEquals(t.params!.map((p) => p.key), ["signingSecret"]);
    assertEquals((t as { poll?: unknown }).poll, undefined);
  }
  assertEquals(byKey("any-event").params!.map((p) => p.key), ["signingSecret", "events"]);
});

test("fixture body is not canonical JSON", () => {
  assert(JSON.stringify(JSON.parse(body("x"))) !== body("x"));
});

test("onSubscribe hands back the callback URL and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  const t = byKey("issue-created");
  assertEquals(
    await t.onSubscribe!(
      {
        params: {},
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "https://api.example.test",
      } as never,
      ctx,
    ),
    { callbackUrl: CALLBACK },
  );
  assertEquals(calls.length, 0);
});

for (const [key, ev] of NAMED) {
  test(`${key}: a valid signed delivery of ${ev} is one event; another event is not`, async () => {
    const out = evs(await ingest(key, input(body(ev))));
    assertEquals(out.length, 1);
    const e = out[0] as Record<string, unknown>;
    assertEquals(e.webhookEvent, ev);
    assertEquals(e.deliveryId, "id-1");
    assertEquals(e.eventType, "issue_created");
    assertEquals(e.timestamp, 1762769400000);
    assertEquals(e.issue, { id: "10001", key: "ENG-42" });
    assertEquals(evs(await ingest(key, input(body("sprint_started")))), []);
  });
}

const SIGNED = [...NAMED.map(([k]) => k), "any-event"];
for (const key of SIGNED) {
  test(`${key}: signature failures throw and echo nothing`, async () => {
    const b = body(NAMED.find(([k]) => k === key)?.[1] ?? "sprint_started");
    // one flipped byte in the body, signature over the original
    await assertRejects(
      () =>
        ingest(
          key,
          input(b.replace("ENG-42", "ENG-43"), { headers: { "x-hub-signature": sign(b) } }),
        ),
      Error,
      "signature does not match",
    );
    // signature over the re-serialised body
    await assertRejects(
      () =>
        ingest(
          key,
          input(b, { headers: { "x-hub-signature": sign(JSON.stringify(JSON.parse(b))) } }),
        ),
      Error,
      "signature does not match",
    );
    // the signature itself with its last character flipped
    const good = sign(b);
    const last = good.endsWith("0") ? "1" : "0";
    await assertRejects(
      () => ingest(key, input(b, { headers: { "x-hub-signature": good.slice(0, -1) + last } })),
      Error,
      "signature does not match",
    );
    // wrong secret, and a non-sha256 method
    await assertRejects(
      () => ingest(key, input(b, { headers: { "x-hub-signature": sign(b, "other") } })),
      Error,
      "signature does not match",
    );
    await assertRejects(
      () =>
        ingest(
          key,
          input(b, { headers: { "x-hub-signature": sign(b).replace("sha256=", "sha1=") } }),
        ),
      Error,
      "signature does not match",
    );
    // header missing
    await assertRejects(() => ingest(key, input(b, { headers: {} })), Error, "X-Hub-Signature");
    // rawBody absent
    await assertRejects(
      () => ingest(key, input(undefined, { headers: { "x-hub-signature": sign(b) } })),
      Error,
      "raw body",
    );
    // non-POST
    await assertRejects(() => ingest(key, input(b, { method: "GET" })), Error, "POST");
    // error text leaks nothing
    try {
      await ingest(key, input(b, { headers: { "x-hub-signature": sign(b, "other") } }));
    } catch (err) {
      const m = (err as Error).message;
      for (const leak of [SECRET, sign(b), sign(b, "other"), "id-1"]) assert(!m.includes(leak));
    }
  });

  test(`${key}: an unset or empty secret is refused first, even with the header absent`, async () => {
    const b = body("jira:issue_created");
    for (const secret of [undefined, ""]) {
      await assertRejects(() => ingest(key, input(b, { secret, headers: {} })), Error, "secret");
      await assertRejects(() => ingest(key, input(b, { secret })), Error, "secret");
    }
  });
}

test("a signed delivery that is not JSON or has no webhookEvent is refused", async () => {
  const notJson = "not json";
  await assertRejects(
    () =>
      byKey("any-event").handleIngest!(
        {
          ...input(undefined),
          raw: {
            method: "POST",
            path: "/",
            query: {},
            headers: { "x-hub-signature": sign(notJson) },
            body: null,
            rawBody: notJson,
          },
        } as never,
        mockCtx().ctx,
      ),
    Error,
    "not JSON",
  );
  const noEvent = `{ "timestamp" : 1 }`;
  await assertRejects(
    () => ingest("any-event", input(noEvent)),
    Error,
    "webhookEvent",
  );
});

test("any-event: blank events keeps every event; a list keeps only those named", async () => {
  assertEquals(evs(await ingest("any-event", input(body("sprint_started")))).length, 1);
  assertEquals(
    evs(
      await ingest(
        "any-event",
        input(body("sprint_started"), {
          params: { events: "jira:issue_created, sprint_started" },
        }),
      ),
    ).length,
    1,
  );
  assertEquals(
    evs(
      await ingest(
        "any-event",
        input(body("sprint_started"), {
          params: { events: "jira:issue_created" },
        }),
      ),
    ),
    [],
  );
});

test("any-event: the whole delivery body rides along as payload (sprint, worklog)", async () => {
  for (
    const [ev, extra] of [
      ["sprint_started", { sprint: { id: 7, state: "active" } }],
      ["worklog_created", { worklog: { id: "w1", timeSpent: "1h" } }],
    ] as const
  ) {
    const b = JSON.stringify({ webhookEvent: ev, timestamp: 1762769400000, ...extra });
    const out = evs(await ingest("any-event", input(b)));
    assertEquals(out.length, 1);
    const e = out[0] as Record<string, unknown>;
    assertEquals(e.webhookEvent, ev);
    assertEquals(e.payload, JSON.parse(b));
  }
});
