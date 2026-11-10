import { test } from "node:test";
import { createSign, generateKeyPairSync } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import type { TriggerCall } from "@w6w/types";
import app from "../../index.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";
import { spec as anyEventSpec } from "../../triggers/any-event.ts";
import { spec as creditedSpec } from "../../triggers/balance-credited.ts";
import { spec as activeCasesSpec } from "../../triggers/transfer-active-cases.ts";
import { spec as recipientSpec } from "../../triggers/recipient-changed.ts";
import { spec as refundSpec } from "../../triggers/transfer-refunded.ts";
import {
  anyEventTrigger,
  EVENT_BINDINGS,
  type PublicKeys,
  webhookTrigger,
} from "../../lib/triggers.ts";

const PROFILE = "222";
const SUB = "01234567-89ab-cdef-0123-456789abcdef";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const KEYS: PublicKeys = {
  live: publicKey.export({ type: "spki", format: "pem" }).toString(),
  sandbox: generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey
    .export({ type: "spki", format: "pem" }).toString(),
};
/** The expected signature, computed with node:crypto — independent of the app's code. */
const sign = (body: string) => createSign("RSA-SHA256").update(body).sign(privateKey, "base64");

function delivery(rawBody: string | undefined, headers: Record<string, string>): TriggerCall {
  const call: TriggerCall = {
    method: "POST",
    path: "/triggers/webhooks/sub_abc",
    query: {},
    headers,
    body: rawBody === undefined ? undefined : JSON.parse(rawBody),
  };
  if (rawBody !== undefined) call.rawBody = rawBody;
  return call;
}
const signed = (body: string, extra: Record<string, string> = {}) =>
  delivery(body, { "x-signature-sha256": sign(body), ...extra });

/** Non-canonical whitespace: re-serialising would not reproduce these bytes. */
const envelope = (eventType: string, data: string) =>
  `{ "schema_version": "4.0.0", "subscription_id": "${SUB}", "event_type": "${eventType}",
  "sent_at": "2026-11-10T10:12:50.123Z", "data": ${data} }`;

const run = (
  trigger: { handleIngest?: unknown },
  call: TriggerCall,
  params: Record<string, unknown> = { environment: "live", profileId: PROFILE },
) =>
  (trigger.handleIngest as (a: unknown, c: unknown) => Promise<unknown>)(
    { raw: call, params, state: { callbackUrl: "https://w6w.example/x" }, subscriptionId: "s" },
    mockCtx().ctx,
  );

// ---- the whole trigger set, pinned ----------------------------------------------------------

test("the app ships exactly these thirteen triggers, each with output and a sample", () => {
  const keys = (app.triggers ?? []).map((t) => t.key).sort();
  assertEquals(keys, [
    "any-event",
    "balance-credited",
    "balance-updated",
    "new-balance",
    "new-profile",
    "new-recipient",
    "new-transfer",
    "profile-state-changed",
    "recipient-changed",
    "transfer-active-cases",
    "transfer-payout-failed",
    "transfer-refunded",
    "transfer-state-changed",
  ]);
  for (const t of app.triggers ?? []) {
    assertEquals((t.output?.length ?? 0) > 0, true, t.key);
    assertEquals(t.sample !== undefined, true, t.key);
    // a poll trigger never declares subscribe hooks (loader invalid_trigger)
    if (typeof t.poll === "function") assertEquals(t.onSubscribe, undefined, t.key);
  }
});

// ---- balance-credited: the credit subset of balances#update ---------------------------------

const balances = webhookTrigger(creditedSpec, KEYS);
const BAL = (type: string) =>
  envelope(
    "balances#update",
    `{ "resource": { "id": 2, "profile_id": 222, "type": "balance-account" },
  "amount": 70, "currency": "GBP", "transaction_type": "${type}" }`,
  );

test("balance-credited: a credit is delivered, a debit is acknowledged with none", async () => {
  const credit = evs(await run(balances, signed(BAL("credit"), { "x-delivery-id": "d1" })));
  assertEquals((credit[0] as { eventType: string }).eventType, "balances#update");
  assertEquals(
    (credit[0] as { data: { transaction_type: string } }).data.transaction_type,
    "credit",
  );
  assertEquals(evs(await run(balances, signed(BAL("debit")))), []);
});

// ---- signed-body cases for each new signed trigger, with a flipped byte of the SIGNATURE ----

const refunds = webhookTrigger(refundSpec, KEYS);
const cases = webhookTrigger(activeCasesSpec, KEYS);
const anyEvent = anyEventTrigger(anyEventSpec, KEYS);
const recipients = webhookTrigger(recipientSpec, KEYS);
const REFUND = envelope(
  "transfers#refund",
  `{ "resource": { "type": "transfer", "id": 111, "profile_id": 222, "account_id": 333,
    "refund_amount": 5000, "refund_currency": "EUR" }, "occurred_at": "2026-11-10T10:12:50Z" }`,
);
const CASES = envelope(
  "transfers#active-cases",
  `{ "resource": { "type": "transfer", "id": 111, "profile_id": 222, "account_id": 333 },
  "active_cases": [ "deposit_amount_less_invoice" ] }`,
);

const RECIPIENT = (state: string, profileId = 222) =>
  envelope(
    "recipients#state-change",
    `{ "resource": { "id": "700525176", "occurred_at": "2026-11-10T10:12:50Z",
    "data": { "recipientId": 700525176, "profileId": ${profileId}, "currency": "EUR",
    "state": "${state}", "clientId": "sample-client" } } }`,
  );

const SIGNED: Array<[string, { handleIngest?: unknown }, string]> = [
  ["transfer-refunded", refunds, REFUND],
  ["transfer-active-cases", cases, CASES],
  ["balance-credited", balances, BAL("credit")],
  ["recipient-changed", recipients, RECIPIENT("CREATE")],
  ["any-event", anyEvent, REFUND],
];

for (const [name, trigger, body] of SIGNED) {
  test(`${name}: non-canonical body verifies; one flipped byte of the SIGNATURE, a body byte, a missing header, no rawBody are refused`, async () => {
    assertEquals(JSON.stringify(JSON.parse(body)) !== body, true);
    assertEquals(evs(await run(trigger, signed(body))).length, 1);

    const good = sign(body);
    const flipped = (good[0] === "A" ? "B" : "A") + good.slice(1);
    await assertRejects(
      async () => await run(trigger, delivery(body, { "x-signature-sha256": flipped })),
      Error,
      "signature does not match",
    );
    // the last base64 char before padding: a flip deep inside the signature
    const mid = good.slice(0, 100) + (good[100] === "A" ? "B" : "A") + good.slice(101);
    await assertRejects(
      async () => await run(trigger, delivery(body, { "x-signature-sha256": mid })),
      Error,
      "signature does not match",
    );
    await assertRejects(
      async () =>
        await run(trigger, delivery(body.replace("222", "223"), { "x-signature-sha256": good })),
      Error,
      "signature does not match",
    );
    await assertRejects(
      async () => await run(trigger, delivery(body, {})),
      Error,
      "X-Signature-SHA256",
    );
    const noRaw = signed(body);
    delete noRaw.rawBody;
    await assertRejects(async () => await run(trigger, noRaw), Error, "raw body");
  });

  test(`${name}: an unset or blank profile ID refuses a validly signed delivery before anything is emitted`, async () => {
    for (const profileId of [undefined, "", "  "]) {
      await assertRejects(
        async () => await run(trigger, signed(body), { environment: "live", profileId }),
        Error,
        "profile",
      );
    }
    // another profile's delivery is refused too
    await assertRejects(
      async () => await run(trigger, signed(body), { environment: "live", profileId: "999" }),
      Error,
      "not for the configured Wise profile",
    );
  });
}

// ---- any-event ------------------------------------------------------------------------------

test("any-event: delivers each bindable event type (profile read from its documented field)", async () => {
  const bodies: Array<[string, string]> = [
    [
      "transfers#state-change",
      `{ "resource": { "type": "transfer", "id": 1, "profile_id": 222 } }`,
    ],
    ["transfers#payout-failure", `{ "transfer_id": 1, "profile_id": 222 }`],
    ["profiles#verification-state-change", `{ "resource": { "type": "profile", "id": 222 } }`],
    [
      "hold-limit-breach#update",
      `{ "resource": { "type": "hold-limit-breach", "profile_id": 222 } }`,
    ],
    ["swift-in#credit", `{ "action": { "type": "credit", "id": 1, "profile_id": 222 } }`],
    [
      "swift#message-received",
      `{ "action": { "id": 1, "profile_id": 222 }, "resource": { "id": "a" } }`,
    ],
    [
      "recipients#state-change",
      `{ "resource": { "id": "1", "data": { "recipientId": 1, "profileId": 222, "state": "UPDATE" } } }`,
    ],
    [
      "account-details-payment#state-change",
      `{ "resource": { "id": 12345, "profile_id": 222, "type": "balance-account" } }`,
    ],
  ];
  for (const [type, data] of bodies) {
    const out = evs(await run(anyEvent, signed(envelope(type, data))));
    assertEquals((out[0] as { eventType: string }).eventType, type);
  }
});

test("any-event: the payout-failure event is bound by its own documented field (data.profile_id)", () => {
  // The existing transfer-payout-failed trigger reads data.profile_id (Wise 5.0.0 payload); the
  // Any Event table must agree or it would refuse every payout failure.
  assertEquals(EVENT_BINDINGS["transfers#payout-failure"].path, ["profile_id"]);
});

test("any-event: another profile, a profile event about a non-profile resource, and a body without the field are refused", async () => {
  await assertRejects(
    async () =>
      await run(
        anyEvent,
        signed(envelope("swift-in#credit", `{ "action": { "profile_id": 999 } }`)),
      ),
    Error,
    "not for the configured Wise profile",
  );
  await assertRejects(
    async () =>
      await run(
        anyEvent,
        signed(
          envelope(
            "profiles#verification-state-change",
            `{ "resource": { "type": "transfer", "id": 222 } }`,
          ),
        ),
      ),
    Error,
    "not for the configured Wise profile",
  );
  await assertRejects(
    async () => await run(anyEvent, signed(envelope("balances#update", `{ "amount": 1 }`))),
    Error,
    "not for the configured Wise profile",
  );
});

test("any-event: the events list is a filter; unbindable or unknown names are refused at subscribe, nothing is requested", async () => {
  const only = {
    environment: "live",
    profileId: PROFILE,
    events: "transfers#refund, balances#update",
  };
  assertEquals(evs(await run(anyEvent, signed(REFUND), only)).length, 1);
  assertEquals(evs(await run(anyEvent, signed(CASES), only)), []);
  const { ctx, calls } = mockCtx();
  for (
    const events of [
      "incoming-transfer#credited",
      "profiles#cdd-check-state-change",
      "cards#card-status-change",
      "kyc-reviews#state-change",
      "nope",
    ]
  ) {
    await assertRejects(
      async () =>
        await anyEvent.onSubscribe!(
          {
            params: { events },
            subscriptionId: "s",
            callbackUrl: "https://w6w.example/x",
            hostUrl: "",
          },
          ctx,
        ),
      Error,
      "cannot tie to your profile",
    );
  }
  assertEquals(
    await anyEvent.onSubscribe!(
      { params: {}, subscriptionId: "s", callbackUrl: "https://w6w.example/x", hostUrl: "" },
      ctx,
    ),
    { callbackUrl: "https://w6w.example/x" },
  );
  assertEquals(calls.length, 0);
});

test("any-event: a validly signed event it cannot bind (incoming-transfer#credited) is acknowledged with none; a test notification starts no run", async () => {
  const unbound = envelope(
    "incoming-transfer#credited",
    `{ "incoming_transfer_id": "01234567-89ab-cdef-0123-456789abcdef" }`,
  );
  assertEquals(evs(await run(anyEvent, signed(unbound))), []);
  assertEquals(evs(await run(anyEvent, signed(REFUND, { "x-test-notification": "true" }))), []);
  // an unsigned one is still refused, whatever it says
  await assertRejects(
    async () => await run(anyEvent, delivery(unbound, {})),
    Error,
    "X-Signature-SHA256",
  );
});

// ---- the polls --------------------------------------------------------------------------------

import newBalance from "../../triggers/new-balance.ts";
import newProfile from "../../triggers/new-profile.ts";
import newRecipient from "../../triggers/new-recipient.ts";
import newTransfer from "../../triggers/new-transfer.ts";
import { clock } from "../../lib/triggers.ts";

type Poll = (i: unknown, ctx: unknown) => Promise<{ events: unknown[]; nextState: unknown }>;
const poll = (t: { poll?: unknown }) => t.poll as unknown as Poll;

const SNAPSHOTS = [
  {
    name: "new-balance",
    trigger: newBalance,
    params: { profileId: 222 },
    respond: (rows: unknown[]) => rows,
    url: `${API_ROOT}/profiles/222/balances?types=STANDARD%2CSAVINGS`,
  },
  {
    name: "new-profile",
    trigger: newProfile,
    params: {},
    respond: (rows: unknown[]) => rows,
    url: `${API_ROOT}/profiles`,
  },
] as const;

for (const c of SNAPSHOTS) {
  const row = (id: number, name: string) => ({ id, name });
  const input = { params: c.params, subscriptionId: "sub-1" };
  const once = (state: unknown, rows: unknown[]) => {
    const m = mockCtx([{ body: c.respond(rows) }]);
    return { m, out: poll(c.trigger)({ ...input, state }, m.ctx) };
  };

  test(`${c.name}: seeds, emits only an added row (not an edit), retries idempotently, sends the literal request`, async () => {
    const seed = once({}, [row(1, "A")]);
    const seeded = await seed.out;
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals([seed.m.calls[0].method, seed.m.calls[0].url], ["GET", c.url]);
    const page = [row(1, "A (renamed)"), row(2, "B")];
    const first = await once(seeded.nextState, page).out;
    const retry = await once(seeded.nextState, page).out;
    assertEquals(first.events, [{ change: "added", key: "2", values: row(2, "B") }]);
    assertEquals(retry, first);
  });
}

test("new-recipient: seeds, emits the new recipient, retries idempotently; the literal request sorts id,desc with size 20", async () => {
  const rec = (id: number) => ({ id, profileId: 222, name: { fullName: `R${id}` } });
  const page = (ids: number[]) => ({ body: { content: ids.map(rec), seekPositionForNext: null } });
  const input = { params: { profileId: 222 }, subscriptionId: "sub-1" };
  const seed = mockCtx([page([5, 4, 3])]);
  const seeded = await poll(newRecipient)({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  const u = new URL(seed.calls[0].url);
  assertEquals(u.origin + u.pathname, `${API_ROOT}/accounts`);
  assertEquals([...u.searchParams.entries()], [["profile", "222"], ["size", "20"], [
    "sort",
    "id,desc",
  ]]);
  const a = await poll(newRecipient)(
    { ...input, state: seeded.nextState },
    mockCtx([page([6, 5, 4])]).ctx,
  );
  const b = await poll(newRecipient)(
    { ...input, state: seeded.nextState },
    mockCtx([page([6, 5, 4])]).ctx,
  );
  assertEquals(a.events, [rec(6)]);
  assertEquals(b, a);
});

// ---- new-transfer: since-filter, resume position (9.8) and floor (9.9) ------------------------

const T0 = Date.parse("2026-11-10T10:00:00Z");
const created = (offsetSec: number) =>
  new Date(T0 + offsetSec * 1000).toISOString().slice(0, 19).replace("T", " ");
const tr = (id: number, offsetSec: number) => ({
  id,
  status: "incoming_payment_waiting",
  created: created(offsetSec),
});
const trInput = { params: { profileId: 222 }, subscriptionId: "sub-1" };
const batch = (items: unknown[]) => ({ body: items });
const at = async <T>(ms: number, f: () => Promise<T>) => {
  const saved = clock.now;
  clock.now = () => ms;
  try {
    return await f();
  } finally {
    clock.now = saved;
  }
};
const checkTr = (state: unknown, responses: Array<{ body: unknown }>, ms: number) =>
  at(ms, async () => {
    const m = mockCtx(responses);
    const out = await poll(newTransfer)({ ...trInput, state }, m.ctx);
    return { out, m };
  });
const ids = (events: unknown[]) => events.map((e) => (e as { id: number }).id);

test("new-transfer: a seed emits nothing, makes no request and records floor and cursor", async () => {
  const { out, m } = await checkTr({}, [], T0);
  assertEquals(out.events, []);
  assertEquals(m.calls.length, 0);
  assertEquals(out.nextState, { v: 1, kind: "ids", seeded: true, ids: [], cursor: T0, floor: T0 });
});

test("new-transfer: the next check lists the window with a literal request and emits only the new transfer; a retry is identical", async () => {
  const seeded = (await checkTr({}, [], T0)).out.nextState;
  const now = T0 + 300_000;
  const resp = [batch([tr(900, -3600), tr(7, 120)])];
  const a = await checkTr(seeded, resp, now);
  const b = await checkTr(seeded, resp, now);
  assertEquals(ids(a.out.events), [7]);
  assertEquals(b.out, a.out);
  assertEquals(a.m.calls[0].method, "GET");
  const u = new URL(a.m.calls[0].url);
  assertEquals(u.origin + u.pathname, `${API_ROOT}/transfers`);
  assertEquals([...u.searchParams.entries()], [
    ["profile", "222"],
    ["createdDateStart", "2026-11-10T10:00:00Z"],
    ["createdDateEnd", "2026-11-10T10:05:00Z"],
    ["limit", "50"],
    ["offset", "0"],
  ]);
  // the next window starts overlap (120s) behind the drained cursor, ids already seen are skipped
  const c = await checkTr(a.out.nextState, [batch([tr(7, 120), tr(8, 330)])], now + 300_000);
  assertEquals(ids(c.out.events), [8]);
  const u2 = new URL(c.m.calls[0].url);
  assertEquals(u2.searchParams.get("createdDateStart"), "2026-11-10T10:03:00Z");
});

test("new-transfer (9.9): records that predate the seed are never emitted, however many pages the window holds", async () => {
  const seeded = (await checkTr({}, [], T0)).out.nextState;
  const old = (from: number, n: number) => Array.from({ length: n }, (_, i) => tr(from + i, -600));
  // four pages (3 per check): 150 old + 150 old are dropped
  const first = await checkTr(
    seeded,
    [batch(old(1, 50)), batch(old(51, 50)), batch(old(101, 50))],
    T0 + 60_000,
  );
  assertEquals(first.out.events, []);
  const second = await checkTr(first.out.nextState, [batch(old(151, 20))], T0 + 120_000);
  assertEquals(second.out.events, []);
  // then one record created after the seed
  const third = await checkTr(second.out.nextState, [batch([tr(9000, 200)])], T0 + 300_000);
  assertEquals(ids(third.out.events), [9000]);
});

test("new-transfer (9.8): a window of more than three pages is drained across checks, none twice, then the cursor advances", async () => {
  const seeded = (await checkTr({}, [], T0)).out.nextState;
  const page = (from: number, n: number) =>
    batch(Array.from({ length: n }, (_, i) => tr(from + i, 10 + from + i)));
  const now = T0 + 600_000;
  const first = await checkTr(seeded, [page(1, 50), page(51, 50), page(101, 50)], now);
  assertEquals(first.out.events.length, 150);
  const s1 = first.out.nextState as { resume?: { offset: number; until: number }; cursor: number };
  assertEquals(s1.resume?.offset, 150);
  assertEquals(s1.cursor, T0);
  // the second check continues at offset 150 with the SAME bounds, even though the clock moved
  const second = await checkTr(first.out.nextState, [page(151, 20)], now + 300_000);
  assertEquals(ids(second.out.events), Array.from({ length: 20 }, (_, i) => 151 + i));
  const u = new URL(second.m.calls[0].url);
  assertEquals(u.searchParams.get("offset"), "150");
  assertEquals(u.searchParams.get("createdDateEnd"), "2026-11-10T10:10:00Z");
  const s2 = second.out.nextState as { resume?: unknown; cursor: number; ids: string[] };
  assertEquals(s2.resume, undefined);
  assertEquals(s2.cursor, now);
  assertEquals(new Set([...ids(first.out.events), ...ids(second.out.events)]).size, 170);
});

test("new-transfer: events come oldest first; a transfer with no parseable time is kept", async () => {
  const seeded = (await checkTr({}, [], T0)).out.nextState;
  const { out } = await checkTr(
    seeded,
    [batch([tr(3, 200), tr(2, 100), { id: 1, status: "x" }])],
    T0 + 300_000,
  );
  assertEquals(ids(out.events), [1, 2, 3]);
});

// ---- recipient-changed: recipients#state-change, profile at data.resource.data.profileId ----------

test("recipient-changed: every documented state is delivered with the recipient, currency and state; the profile is read from data.resource.data.profileId", async () => {
  for (const state of ["CREATE", "UPDATE", "DEACTIVATE", "OBFUSCATE", "DELETE"]) {
    const out = evs(await run(recipients, signed(RECIPIENT(state), { "x-delivery-id": "d9" })));
    assertEquals(out.length, 1);
    const e = out[0] as {
      eventType: string;
      deliveryId: string;
      data: {
        resource: { id: string; data: { recipientId: number; currency: string; state: string } };
      };
    };
    assertEquals(e.eventType, "recipients#state-change");
    assertEquals(e.deliveryId, "d9");
    assertEquals(e.data.resource.data.state, state);
    assertEquals(e.data.resource.data.recipientId, 700525176);
    assertEquals(e.data.resource.data.currency, "EUR");
  }
  assertEquals(EVENT_BINDINGS["recipients#state-change"].path, ["resource", "data", "profileId"]);
});

test("recipient-changed: a validly signed event about ANOTHER profile is refused; a body without the field is refused; a test notification starts no run", async () => {
  await assertRejects(
    async () => await run(recipients, signed(RECIPIENT("CREATE", 999))),
    Error,
    "not for the configured Wise profile",
  );
  await assertRejects(
    async () =>
      await run(
        recipients,
        signed(envelope("recipients#state-change", `{ "resource": { "id": "1", "data": {} } }`)),
      ),
    Error,
    "not for the configured Wise profile",
  );
  assertEquals(
    evs(await run(recipients, signed(RECIPIENT("CREATE"), { "x-test-notification": "true" }))),
    [],
  );
});

test("recipient-changed: flipping the first, a middle and the last full-data character of the SIGNATURE (not the body) is refused", async () => {
  const body = RECIPIENT("UPDATE");
  const good = sign(body);
  assertEquals(good.length, 344);
  for (const i of [0, 171, 340]) {
    const flipped = good.slice(0, i) + (good[i] === "A" ? "B" : "A") + good.slice(i + 1);
    await assertRejects(
      async () => await run(recipients, delivery(body, { "x-signature-sha256": flipped })),
      Error,
      "signature does not match",
    );
  }
  assertEquals(
    evs(await run(recipients, delivery(body, { "x-signature-sha256": good }))).length,
    1,
  );
});

test("recipient-changed: another event type on the same URL starts nothing", async () => {
  assertEquals(evs(await run(recipients, signed(REFUND))), []);
});
