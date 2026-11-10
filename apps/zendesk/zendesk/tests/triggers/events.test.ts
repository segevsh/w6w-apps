import { test } from "node:test";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockZendeskCtx } from "../_helpers.ts";
import ticketDeleted from "../../triggers/ticket-deleted.ts";
import ticketPriorityChanged from "../../triggers/ticket-priority-changed.ts";
import ticketAssigneeChanged from "../../triggers/ticket-assignee-changed.ts";
import newUser from "../../triggers/new-user.ts";
import userDeleted from "../../triggers/user-deleted.ts";
import userDetailsChanged from "../../triggers/user-details-changed.ts";
import newOrganization from "../../triggers/new-organization.ts";
import organizationDeleted from "../../triggers/organization-deleted.ts";
import anyEvent from "../../triggers/any-event.ts";

const SECRET = "test-secret";
const PREFIX = "zen:event-type:";

/** Narrow the `E[] | { events, response? }` union (brief §3). */
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** Expected signature, computed independently of the app: base64(HMAC-SHA256(secret, ts + body)). */
const sign = (ts: string, body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(ts + body).digest("base64");

/** Positions of the signature to flip: first, middle and last. */
const flipPositions = (sig: string) => [0, Math.floor(sig.length / 2), sig.length - 1];
/** The same string with the character at `at` changed to a different one. */
const flipAt = (s: string, at: number) => {
  const out = s.slice(0, at) + (s[at] === "A" ? "B" : "A") + s.slice(at + 1);
  assert(out !== s && out.length === s.length);
  return out;
};

const nowIso = () => new Date().toISOString();

/** Non-canonical whitespace so JSON.stringify(JSON.parse(body)) !== body. */
function bodyFor(type: string, subject: string, id: string, event = "{ }"): string {
  return `{ "type": "${type}",  "id": "evt-1",\n  "account_id": 18763612, "time": "2025-07-04T05:33:18Z",\n  "subject": "${subject}", "detail": { "id": "${id}", "name": "x" },  "event": ${event} }`;
}

function call(
  headers: Record<string, string>,
  rawBody: string | null,
  method = "POST",
): TriggerCall {
  const raw: TriggerCall = { method, path: "/hook", query: {}, headers, body: null };
  if (rawBody !== null) {
    raw.rawBody = rawBody;
    raw.body = JSON.parse(rawBody);
  }
  return raw;
}

const signed = (body: string, ts = nowIso()) => ({
  "x-zendesk-webhook-signature": sign(ts, body),
  "x-zendesk-webhook-signature-timestamp": ts,
});

// deno-lint-ignore no-explicit-any
type AnyTrigger = any;

const named: Array<{
  trigger: AnyTrigger;
  eventType: string;
  subject: string;
  id: string;
  ticket: boolean;
}> = [
  {
    trigger: ticketDeleted,
    eventType: "ticket.soft_deleted",
    subject: "zen:ticket:5158",
    id: "5158",
    ticket: true,
  },
  {
    trigger: ticketPriorityChanged,
    eventType: "ticket.priority_changed",
    subject: "zen:ticket:5158",
    id: "5158",
    ticket: true,
  },
  {
    trigger: ticketAssigneeChanged,
    eventType: "ticket.agent_assignment_changed",
    subject: "zen:ticket:5158",
    id: "5158",
    ticket: true,
  },
  { trigger: newUser, eventType: "user.created", subject: "zen:user:77", id: "77", ticket: false },
  {
    trigger: userDeleted,
    eventType: "user.deleted",
    subject: "zen:user:77",
    id: "77",
    ticket: false,
  },
  {
    trigger: userDetailsChanged,
    eventType: "user.details_changed",
    subject: "zen:user:77",
    id: "77",
    ticket: false,
  },
  {
    trigger: newOrganization,
    eventType: "organization.created",
    subject: "zen:organization:88",
    id: "88",
    ticket: false,
  },
  {
    trigger: organizationDeleted,
    eventType: "organization.deleted",
    subject: "zen:organization:88",
    id: "88",
    ticket: false,
  },
];

async function ingest(trigger: AnyTrigger, raw: TriggerCall, state: unknown, params = {}) {
  const { ctx } = mockZendeskCtx();
  return await trigger.handleIngest!({ raw, params, state, subscriptionId: "sub-1" }, ctx);
}

for (const { trigger, eventType, subject, id, ticket } of named) {
  const type = PREFIX + eventType;
  const body = bodyFor(type, subject, id);
  const state = { webhookId: "W1", eventType: type, signingSecret: SECRET };
  const k = trigger.key;

  test(`${k}: fixture body has non-canonical whitespace`, () => {
    assert(JSON.stringify(JSON.parse(body)) !== body);
  });

  test(`${k}: a valid signature over the exact bytes yields the event`, async () => {
    const out = evs(await ingest(trigger, call(signed(body), body), state));
    assertEquals(out.length, 1);
    const expected = ticket
      ? {
        eventId: "evt-1",
        type,
        time: "2025-07-04T05:33:18Z",
        accountId: "18763612",
        ticketId: id,
        subject,
        detail: { id, name: "x" },
        event: {},
      }
      : {
        eventId: "evt-1",
        type,
        time: "2025-07-04T05:33:18Z",
        accountId: "18763612",
        resourceId: id,
        subject,
        detail: { id, name: "x" },
        event: {},
      };
    assertEquals(out[0], expected);
  });

  test(`${k}: one flipped byte of the SIGNATURE (first, middle, last) throws`, async () => {
    const ts = nowIso();
    const good = sign(ts, body);
    for (const at of flipPositions(good)) {
      await assertRejects(
        () =>
          ingest(
            trigger,
            call({
              "x-zendesk-webhook-signature": flipAt(good, at),
              "x-zendesk-webhook-signature-timestamp": ts,
            }, body),
            state,
          ),
        Error,
        "refused",
      );
    }
  });

  test(`${k}: one flipped byte of the body throws`, async () => {
    const headers = signed(body);
    await assertRejects(
      () => ingest(trigger, call(headers, body.replace('"x"', '"y"')), state),
      Error,
      "refused",
    );
  });

  test(`${k}: a signature over the re-serialised body does not verify`, async () => {
    const reserialised = JSON.stringify(JSON.parse(body));
    await assertRejects(
      () => ingest(trigger, call(signed(reserialised), body), state),
      Error,
      "refused",
    );
  });

  test(`${k}: a missing signature or timestamp header throws`, async () => {
    const ts = nowIso();
    await assertRejects(
      () => ingest(trigger, call({ "x-zendesk-webhook-signature-timestamp": ts }, body), state),
      Error,
      "refused",
    );
    await assertRejects(
      () => ingest(trigger, call({ "x-zendesk-webhook-signature": sign(ts, body) }, body), state),
      Error,
      "refused",
    );
  });

  test(`${k}: an absent rawBody throws`, async () => {
    await assertRejects(() => ingest(trigger, call(signed(body), null), state), Error, "raw body");
  });

  test(`${k}: a stale or future timestamp throws`, async () => {
    for (const offsetMs of [-10 * 60_000, 10 * 60_000]) {
      const ts = new Date(Date.now() + offsetMs).toISOString();
      await assertRejects(
        () => ingest(trigger, call(signed(body, ts), body), state),
        Error,
        "refused",
      );
    }
  });

  test(`${k}: an unset or empty secret refuses before any compare`, async () => {
    const empty = call({
      "x-zendesk-webhook-signature": "",
      "x-zendesk-webhook-signature-timestamp": nowIso(),
    }, body);
    for (const st of [null, {}, { ...state, signingSecret: "" }]) {
      for (const raw of [call({}, body), empty, call(signed(body), body)]) {
        await assertRejects(() => ingest(trigger, raw, st), Error, "secret");
      }
    }
  });

  test(`${k}: a verified delivery of another event type is acknowledged, not emitted`, async () => {
    const other = bodyFor(PREFIX + "ticket.merged", "zen:ticket:1", "1");
    assertEquals(evs(await ingest(trigger, call(signed(other), other), state)), []);
  });

  test(`${k}: onSubscribe registers the literal event type; onUnsubscribe deletes`, async () => {
    const { ctx, calls } = mockZendeskCtx([
      { body: { webhooks: [] } },
      { status: 201, body: { webhook: { id: "W1" } } },
      { body: { signing_secret: { secret: SECRET } } },
      { status: 204 },
    ]);
    const out = await trigger.onSubscribe!(
      { params: {}, subscriptionId: "sub-1", callbackUrl: "https://w6w.example/h", hostUrl: "" },
      ctx,
    );
    assertEquals(out, { webhookId: "W1", eventType: type, signingSecret: SECRET });
    assertEquals(calls[1].method, "POST");
    assertEquals(calls[1].url, "https://acme.zendesk.com/api/v2/webhooks");
    assertEquals(JSON.parse(calls[1].body!).webhook.subscriptions, [type]);
    await trigger.onUnsubscribe!({ params: {}, state: out, subscriptionId: "sub-1" }, ctx);
    assertEquals(calls[3].method, "DELETE");
    assertEquals(calls[3].url, "https://acme.zendesk.com/api/v2/webhooks/W1");
  });

  test(`${k}: declares output, sample and webhook hooks, no poll`, () => {
    assert((trigger.output as unknown[]).length > 0);
    assert(trigger.sample !== undefined);
    assertEquals(trigger.poll, undefined);
    assertEquals(typeof trigger.handleIngest, "function");
  });
}

// ---- Any event ----

const ANY_TYPES = [PREFIX + "ticket.merged", PREFIX + "user.role_changed"];
const anyState = {
  webhookId: "W9",
  eventType: ANY_TYPES.join(","),
  eventTypes: ANY_TYPES,
  signingSecret: SECRET,
};
const anyBody = bodyFor(ANY_TYPES[1], "zen:user:77", "77", '{ "previous": "end-user" }');

test("any-event: a listed event type is emitted with its resource id and event", async () => {
  const out = evs(
    await ingest(anyEvent, call(signed(anyBody), anyBody), anyState, {
      events: "ticket.merged, user.role_changed",
    }),
  );
  assertEquals(out, [{
    eventId: "evt-1",
    type: ANY_TYPES[1],
    time: "2025-07-04T05:33:18Z",
    accountId: "18763612",
    resourceId: "77",
    subject: "zen:user:77",
    detail: { id: "77", name: "x" },
    event: { previous: "end-user" },
  }]);
});

test("any-event: an event type outside the list is filtered out", async () => {
  const other = bodyFor(PREFIX + "user.created", "zen:user:77", "77");
  assertEquals(evs(await ingest(anyEvent, call(signed(other), other), anyState)), []);
});

test("any-event: one flipped byte of the SIGNATURE (first, middle, last) throws", async () => {
  const ts = nowIso();
  const good = sign(ts, anyBody);
  for (const at of flipPositions(good)) {
    await assertRejects(
      () =>
        ingest(
          anyEvent,
          call({
            "x-zendesk-webhook-signature": flipAt(good, at),
            "x-zendesk-webhook-signature-timestamp": ts,
          }, anyBody),
          anyState,
        ),
      Error,
      "refused",
    );
  }
});

test("any-event: tampered body, missing header, absent rawBody and stale timestamp all throw", async () => {
  await assertRejects(
    () => ingest(anyEvent, call(signed(anyBody), anyBody.replace("77", "78")), anyState),
    Error,
    "refused",
  );
  await assertRejects(() => ingest(anyEvent, call({}, anyBody), anyState), Error, "refused");
  await assertRejects(
    () => ingest(anyEvent, call(signed(anyBody), null), anyState),
    Error,
    "raw body",
  );
  const stale = new Date(Date.now() - 10 * 60_000).toISOString();
  await assertRejects(
    () => ingest(anyEvent, call(signed(anyBody, stale), anyBody), anyState),
    Error,
    "refused",
  );
});

test("any-event: an unset or empty secret refuses before any compare", async () => {
  for (const st of [null, {}, { ...anyState, signingSecret: "" }]) {
    for (const raw of [call({}, anyBody), call(signed(anyBody), anyBody)]) {
      await assertRejects(() => ingest(anyEvent, raw, st), Error, "secret");
    }
  }
});

test("any-event: onSubscribe registers exactly the listed events (short and full forms)", async () => {
  const { ctx, calls } = mockZendeskCtx([
    { body: { webhooks: [] } },
    { status: 201, body: { webhook: { id: "W9" } } },
    { body: { signing_secret: { secret: SECRET } } },
  ]);
  const out = await anyEvent.onSubscribe!(
    {
      params: { events: "ticket.merged, zen:event-type:user.role_changed , ticket.merged" },
      subscriptionId: "sub-9",
      callbackUrl: "https://w6w.example/h",
      hostUrl: "",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[1].body!), {
    webhook: {
      name: "w6w sub-9",
      status: "active",
      endpoint: "https://w6w.example/h",
      http_method: "POST",
      request_format: "json",
      subscriptions: ["zen:event-type:ticket.merged", "zen:event-type:user.role_changed"],
    },
  });
  assertEquals(out, anyState);
});

test("any-event: an empty or malformed events list is refused before any request", async () => {
  for (const events of ["", "  ,  ", "ticket", "zen:event-type:", "Ticket.Merged", undefined]) {
    const { ctx, calls } = mockZendeskCtx();
    await assertRejects(
      () =>
        anyEvent.onSubscribe!(
          {
            params: { events } as { events: string },
            subscriptionId: "s",
            callbackUrl: "https://w6w.example/h",
            hostUrl: "",
          },
          ctx,
        ),
      Error,
      "event type",
    );
    assertEquals(calls.length, 0);
  }
});

test("any-event: declares a required events param, output and sample", () => {
  assertEquals(anyEvent.key, "any-event");
  assertEquals(anyEvent.params?.map((p) => [p.key, p.type, p.required]), [[
    "events",
    "string",
    true,
  ]]);
  assert((anyEvent.output as unknown[]).length > 0);
  assert(anyEvent.sample !== undefined);
});
