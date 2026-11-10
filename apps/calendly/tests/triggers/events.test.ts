import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import noShowCreated from "../../triggers/invitee-no-show-created.ts";
import noShowDeleted from "../../triggers/invitee-no-show-deleted.ts";
import typeCreated from "../../triggers/event-type-created.ts";
import typeUpdated from "../../triggers/event-type-updated.ts";
import typeDeleted from "../../triggers/event-type-deleted.ts";
import routing from "../../triggers/routing-form-submission-created.ts";
import anyEvent from "../../triggers/any-event.ts";
import {
  checkScope,
  DEFAULT_ANY_EVENTS,
  KNOWN_EVENTS,
  parseEvents,
  TOLERANCE_SEC,
} from "../../lib/triggers.ts";

// Round 3: the rest of Calendly's event catalog. Every case signs with node:crypto, never the
// app's own hmac, and every request is a literal.
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-secret";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const nowSec = () => Math.floor(Date.now() / 1000);
const sig = (t: number, body: string, secret = SECRET) =>
  `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;

// Non-canonical whitespace everywhere: JSON.stringify(JSON.parse(b)) !== b.
const noShowBody = (event: string) =>
  `{ "created_at":"2026-11-10T10:00:00.000000Z",  "created_by":"https://api.calendly.com/users/U1",
  "event" : "${event}",
  "payload": { "uri":"https://api.calendly.com/scheduled_events/E1/invitees/I1", "name":"Ada", "email":"ada@example.com",
  "status":"active", "no_show": {"uri":"https://api.calendly.com/invitee_no_shows/N1"},
  "scheduled_event": {"uri":"https://api.calendly.com/scheduled_events/E1","name":"Intro",
  "start_time":"2026-11-12T15:00:00.000000Z","end_time":"2026-11-12T15:30:00.000000Z"},
  "questions_and_answers":[], "rescheduled":false } }`;
const typeBody = (event: string) =>
  `{ "created_at":"2026-11-10T10:00:00.000000Z",  "created_by":"https://api.calendly.com/users/U1",
  "event" : "${event}",
  "payload": { "uri":"https://api.calendly.com/event_types/T1", "name" : "Intro call", "active":true,
  "slug":"intro", "scheduling_url":"https://calendly.com/acme/intro", "duration":30, "kind":"solo" } }`;
const routingBody =
  `{ "created_at":"2026-11-10T10:00:00.000000Z",  "created_by":"https://api.calendly.com/users/U1",
  "event" : "routing_form_submission.created",
  "payload": { "uri":"https://api.calendly.com/routing_form_submissions/R1",
  "routing_form":"https://api.calendly.com/routing_forms/F1", "submitter":null,
  "questions_and_answers":[{"question":"Size?","answer":"11-50"}],
  "result":{"type":"event_type","value":"https://calendly.com/acme/sales"} } }`;

// The five trigger types differ in their generics; the tests drive them through one loose view.
interface Hooks {
  handleIngest(input: unknown, ctx: unknown): Promise<unknown>;
  onUnsubscribe(input: unknown, ctx: unknown): Promise<void>;
}

interface Case {
  name: string;
  trigger: typeof noShowCreated | typeof typeCreated | typeof routing | typeof anyEvent;
  event: string;
  body: string;
  other: string; // a different, correctly signed event the trigger must acknowledge with no run
  check: (e: Record<string, unknown>) => void;
}

const otherBody = typeBody("event_type.created");
const CASES: Case[] = [
  {
    name: "invitee-no-show-created",
    trigger: noShowCreated,
    event: "invitee_no_show.created",
    body: noShowBody("invitee_no_show.created"),
    other: noShowBody("invitee_no_show.deleted"),
    check: (e) => {
      assertEquals(e.email, "ada@example.com");
      assertEquals(e.eventName, "Intro");
      assertEquals(
        (e.payload as { no_show: { uri: string } }).no_show.uri,
        "https://api.calendly.com/invitee_no_shows/N1",
      );
    },
  },
  {
    name: "invitee-no-show-deleted",
    trigger: noShowDeleted,
    event: "invitee_no_show.deleted",
    body: noShowBody("invitee_no_show.deleted"),
    other: noShowBody("invitee_no_show.created"),
    check: (e) =>
      assertEquals(e.inviteeUri, "https://api.calendly.com/scheduled_events/E1/invitees/I1"),
  },
  ...([[typeCreated, "created"], [typeUpdated, "updated"], [typeDeleted, "deleted"]] as const)
    .map(([trigger, k]): Case => ({
      name: `event-type-${k}`,
      trigger,
      event: `event_type.${k}`,
      body: typeBody(`event_type.${k}`),
      other: typeBody(`event_type.${k === "created" ? "deleted" : "created"}`),
      check: (e) => {
        assertEquals(e.uri, "https://api.calendly.com/event_types/T1");
        assertEquals(e.name, "Intro call");
        assertEquals(e.slug, "intro");
        assertEquals(e.active, true);
        assertEquals(e.schedulingUrl, "https://calendly.com/acme/intro");
        assertEquals(e.duration, 30);
        assertEquals(e.kind, "solo");
        assertEquals(e.createdBy, "https://api.calendly.com/users/U1");
      },
    })),
  {
    name: "routing-form-submission-created",
    trigger: routing,
    event: "routing_form_submission.created",
    body: routingBody,
    other: otherBody,
    check: (e) => {
      assertEquals(e.routingForm, "https://api.calendly.com/routing_forms/F1");
      assertEquals(e.submitter, null);
      assertEquals(e.questionsAndAnswers, [{ question: "Size?", answer: "11-50" }]);
      assertEquals(e.result, { type: "event_type", value: "https://calendly.com/acme/sales" });
    },
  },
  {
    name: "any-event",
    trigger: anyEvent,
    event: "event_type.updated",
    body: typeBody("event_type.updated"),
    other: typeBody("event_type.deleted"),
    check: (e) => {
      assertEquals(e.event, "event_type.updated");
      assertEquals(e.uri, "https://api.calendly.com/event_types/T1");
      assertEquals(e.name, "Intro call");
    },
  },
];

const callFor = (c: Case, over: Record<string, unknown> = {}, body: string | null = c.body) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "calendly-webhook-signature": sig(nowSec(), body ?? c.body) } as Record<
      string,
      string
    >,
    body: body === null ? null : JSON.parse(body),
    ...(body === null ? {} : { rawBody: body }),
    ...over,
  },
  params: {} as Record<string, unknown>,
  state: {
    webhookUuid: "W1",
    event: c.event,
    events: [c.event],
    scope: "organization",
    secret: SECRET,
  } as Record<string, unknown>,
  subscriptionId: "sub_1",
});

const run = (c: Case, input: ReturnType<typeof callFor>) =>
  (c.trigger as unknown as Hooks).handleIngest(input, mockCtx().ctx);

test("fixtures have non-canonical whitespace", () => {
  for (const c of CASES) assert(JSON.stringify(JSON.parse(c.body)) !== c.body, c.name);
});

test("app wires all nine webhook triggers, each with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "invitee-created",
    "invitee-canceled",
    "invitee-no-show-created",
    "invitee-no-show-deleted",
    "event-type-created",
    "event-type-updated",
    "event-type-deleted",
    "routing-form-submission-created",
    "any-event",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0 && t.sample !== undefined, t.key);
    assertEquals(typeof t.onSubscribe, "function", t.key);
    assertEquals(typeof t.onUnsubscribe, "function", t.key);
    assertEquals(t.poll, undefined, t.key);
  }
});

for (const c of CASES) {
  test(`${c.name}: valid signature → one normalized event`, async () => {
    const out = evs(await run(c, callFor(c))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].event, c.event);
    c.check(out[0]);
  });

  test(`${c.name}: a signed delivery of another event → acknowledged, no event`, async () => {
    assertEquals(evs(await run(c, callFor(c, {}, c.other))), []);
  });

  test(`${c.name}: one flipped byte of the SIGNATURE → refused`, async () => {
    const good = sig(nowSec(), c.body);
    const last = good.slice(-1);
    const bad = good.slice(0, -1) + (last === "0" ? "1" : "0");
    assert(bad !== good);
    await assertRejects(
      () => run(c, callFor(c, { headers: { "calendly-webhook-signature": bad } })),
      Error,
      "signature does not match",
    );
  });

  test(`${c.name}: one flipped byte of the BODY → refused`, async () => {
    await assertRejects(
      () => run(c, callFor(c, { rawBody: c.body.replace("0", "1") })),
      Error,
      "signature does not match",
    );
  });

  test(`${c.name}: signature under another key → refused`, async () => {
    const t = nowSec();
    await assertRejects(
      () =>
        run(
          c,
          callFor(c, { headers: { "calendly-webhook-signature": sig(t, c.body, "other-key") } }),
        ),
      Error,
      "signature does not match",
    );
  });

  test(`${c.name}: header missing → refused`, async () => {
    await assertRejects(() => run(c, callFor(c, { headers: {} })), Error, "header is missing");
  });

  test(`${c.name}: rawBody absent → refused, even with a correct signature`, async () => {
    await assertRejects(() => run(c, callFor(c, {}, null)), Error, "raw body");
  });

  test(`${c.name}: stale timestamp (correctly signed) → refused`, async () => {
    const t = nowSec() - (TOLERANCE_SEC + 60);
    await assertRejects(
      () => run(c, callFor(c, { headers: { "calendly-webhook-signature": sig(t, c.body) } })),
      Error,
      "tolerance",
    );
  });

  test(`${c.name}: unset or empty key + absent or empty header → refused before any compare`, async () => {
    for (const secret of [null, ""]) {
      for (const headers of [{}, { "calendly-webhook-signature": "" }]) {
        const input = callFor(c, { headers });
        input.state.secret = secret;
        await assertRejects(() => run(c, input), Error, "secret");
      }
    }
  });

  test(`${c.name}: errors never echo the key or the signature`, async () => {
    const h = sig(nowSec(), c.body, "other-key");
    try {
      await run(c, callFor(c, { headers: { "calendly-webhook-signature": h } }));
      assert(false, "must throw");
    } catch (e) {
      const m = (e as Error).message;
      assert(!m.includes(SECRET) && !m.includes(h) && !m.includes(h.split("v1=")[1]), m);
    }
  });

  test(`${c.name}: a non-POST call is refused`, async () => {
    await assertRejects(() => run(c, callFor(c, { method: "GET" })), Error, "POST");
  });
}

const ME = {
  body: {
    resource: {
      uri: "https://api.calendly.com/users/U1",
      current_organization: "https://api.calendly.com/organizations/O1",
    },
  },
};
const CREATED = {
  status: 201,
  body: { resource: { uri: "https://api.calendly.com/webhook_subscriptions/W9" } },
};

test("event-type-updated onSubscribe: GET /users/me then POST with its one event", async () => {
  const { ctx, calls } = mockCtx([ME, CREATED]);
  const state = await typeUpdated.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  ) as { secret: string };
  assertEquals(calls.length, 2);
  assertEquals([calls[0].method, new URL(calls[0].url).pathname], ["GET", "/users/me"]);
  assertEquals([calls[1].method, new URL(calls[1].url).pathname], [
    "POST",
    "/webhook_subscriptions",
  ]);
  const sent = JSON.parse(calls[1].body!);
  assert(/^[0-9a-f]{64}$/.test(sent.signing_key));
  assertEquals({ ...sent, signing_key: "K" }, {
    url: CALLBACK,
    events: ["event_type.updated"],
    organization: "https://api.calendly.com/organizations/O1",
    scope: "organization",
    signing_key: "K",
  });
  assertEquals(state, {
    webhookUuid: "W9",
    events: ["event_type.updated"],
    scope: "organization",
    secret: sent.signing_key,
  });
});

test("routing-form-submission-created always subscribes on the organization scope", async () => {
  const { ctx, calls } = mockCtx([ME, CREATED]);
  await routing.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(JSON.parse(calls[1].body!).scope, "organization");
  assertEquals(JSON.parse(calls[1].body!).events, ["routing_form_submission.created"]);
  assertEquals(routing.params!.map((p) => p.key), ["signingKey"]);
});

test("any-event onSubscribe: empty events = the all-plans list; user scope adds the user", async () => {
  const { ctx, calls } = mockCtx([ME, CREATED]);
  await anyEvent.onSubscribe!(
    { params: { scope: "user" }, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  const sent = JSON.parse(calls[1].body!);
  assertEquals(sent.events, [
    "invitee.created",
    "invitee.canceled",
    "invitee_no_show.created",
    "invitee_no_show.deleted",
    "event_type.created",
    "event_type.updated",
    "event_type.deleted",
  ]);
  assertEquals(sent.scope, "user");
  assertEquals(sent.user, "https://api.calendly.com/users/U1");
});

test("any-event onSubscribe: a listed set is sent verbatim; OAuth key → no signing_key sent", async () => {
  const { ctx, calls } = mockCtx([ME, CREATED]);
  const state = await anyEvent.onSubscribe!(
    {
      params: { events: "invitee.created, contact.created", signingKey: "test-secret" },
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[1].body!), {
    url: CALLBACK,
    events: ["invitee.created", "contact.created"],
    organization: "https://api.calendly.com/organizations/O1",
    scope: "organization",
  });
  assertEquals((state as { secret: unknown }).secret, null);
});

test("any-event: an unknown event or a scope the vendor refuses fails before any request", async () => {
  for (
    const [params, msg] of [
      [{ events: "invitee.created, nope.created" }, "nope.created"],
      [{ events: "routing_form_submission.created", scope: "user" }, "organization scope"],
      [{ events: "meeting_recap.created" }, "user scope"],
      [
        { events: "meeting_recap.created, routing_form_submission.created", scope: "user" },
        "organization scope",
      ],
    ] as const
  ) {
    const { ctx, calls } = mockCtx([ME, CREATED]);
    await assertRejects(
      () =>
        anyEvent.onSubscribe!(
          { params, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
          ctx,
        ),
      Error,
      msg,
    );
    assertEquals(calls.length, 0);
  }
});

test("any-event: only the subscribed events produce a run; the stored list wins", async () => {
  const c = CASES[CASES.length - 1];
  const input = callFor(c);
  input.state.events = ["invitee.created"];
  assertEquals(evs(await run(c, input)), []);
  input.state.events = ["event_type.updated", "invitee.created"];
  assertEquals(evs(await run(c, input)).length, 1);
});

test("parseEvents / checkScope / catalog", () => {
  assertEquals(parseEvents(""), DEFAULT_ANY_EVENTS);
  assertEquals(parseEvents(undefined), DEFAULT_ANY_EVENTS);
  assertEquals(parseEvents("invitee.created invitee.created,event_type.deleted"), [
    "invitee.created",
    "event_type.deleted",
  ]);
  assertEquals(KNOWN_EVENTS.length, 14);
  checkScope(["meeting_recap.created"], "user");
  checkScope(["routing_form_submission.created"], "organization");
});

test("onUnsubscribe DELETEs the subscription; 404 and 410 are already gone; 500 propagates", async () => {
  const state = {
    webhookUuid: "W9",
    events: ["event_type.created"],
    scope: "organization",
    secret: SECRET,
  };
  const input = { params: {}, state, subscriptionId: "s" };
  for (const t of [typeCreated, anyEvent, routing]) {
    const ok = mockCtx([{ status: 204 }]);
    await (t as unknown as Hooks).onUnsubscribe(input, ok.ctx);
    assertEquals(ok.calls[0].method, "DELETE");
    assertEquals(new URL(ok.calls[0].url).pathname, "/webhook_subscriptions/W9");
    for (const status of [404, 410]) {
      await (t as unknown as Hooks).onUnsubscribe(
        input,
        mockCtx([{ status, body: { title: "Not Found" } }]).ctx,
      );
    }
    await assertRejects(
      () => (t as unknown as Hooks).onUnsubscribe(input, mockCtx([{ status: 500, body: {} }]).ctx),
      Error,
      "500",
    );
  }
  const none = mockCtx([]);
  await typeCreated.onUnsubscribe!(
    { params: {}, state: undefined as never, subscriptionId: "s" },
    none.ctx,
  );
  assertEquals(none.calls.length, 0);
});
