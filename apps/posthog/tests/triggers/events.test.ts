import { test } from "node:test";
import nodeAssert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import anyEvent from "../../triggers/event-captured.ts";
import pageview from "../../triggers/pageview.ts";
import personIdentified from "../../triggers/person-identified.ts";
import featureFlagCalled from "../../triggers/feature-flag-called.ts";
import newCohort from "../../triggers/new-cohort.ts";
import newFeatureFlag from "../../triggers/new-feature-flag.ts";
import newOrUpdatedInsight from "../../triggers/new-or-updated-insight.ts";

async function rejects(fn: () => PromiseLike<unknown> | unknown): Promise<Error> {
  try {
    await fn();
  } catch (err) {
    nodeAssert.ok(err instanceof Error);
    return err;
  }
  throw new Error("Expected the call to reject.");
}

const evs = (r: unknown) =>
  (Array.isArray(r) ? r : (r as { events: unknown[] }).events) as Array<Record<string, unknown>>;
const KEY_BYTES = Buffer.alloc(32, 9);
const SECRET = KEY_BYTES.toString("base64");
const WRONG = Buffer.alloc(32, 3).toString("base64");

const body = (event: string) =>
  `{ "event" : { "uuid":"E1",  "event":"${event}", "distinct_id":"user-1",
  "timestamp":"2026-11-10T10:30:00.000Z", "properties": {"k":"v"} },
  "person" : { "id":"P1",   "properties": {} } }`;
nodeAssert.notEqual(JSON.stringify(JSON.parse(body("x"))), body("x"));

const nowSec = () => Math.floor(Date.now() / 1000);
const mac = (id: string, ts: number, b: string, key: Buffer = KEY_BYTES) =>
  createHmac("sha256", key).update(`${id}.${ts}.${b}`).digest("base64");
const headersFor = (b: string, ts = nowSec(), sigOverride?: string) => ({
  "webhook-id": "msg_1",
  "webhook-timestamp": String(ts),
  "webhook-signature": sigOverride ?? `v1,${mac("msg_1", ts, b)}`,
});
const call = (
  b: string | undefined,
  headers: Record<string, string>,
  params: Record<string, unknown> = { signingSecret: SECRET },
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers,
    body: b === undefined ? null : JSON.parse(b),
    ...(b === undefined ? {} : { rawBody: b }),
  },
  params,
  state: { callbackUrl: "https://api.example.test/triggers/webhooks/sub_5" },
  subscriptionId: "sub_5",
});
// deno-lint-ignore no-explicit-any
const ingest = async (t: any, input: ReturnType<typeof call>) =>
  await t.handleIngest!(input, mockCtx().ctx);

/** Flip one base64 character at the start, the middle and the end of the signature value. */
function flips(value: string): string[] {
  return [0, Math.floor(value.length / 2), value.length - 2].map((i) =>
    value.slice(0, i) + (value[i] === "A" ? "B" : "A") + value.slice(i + 1)
  );
}

const SIGNED = [
  [pageview, "$pageview"],
  [personIdentified, "$identify"],
  [featureFlagCalled, "$feature_flag_called"],
  [anyEvent, "signed_up"],
] as const;

for (const [t, event] of SIGNED) {
  test(`posthog ${t.key} (${event}): Standard Webhooks signature verified, tampering refused`, async () => {
    const b = body(event);
    const out = evs(await ingest(t, call(b, headersFor(b))));
    assertEquals(out.length, 1);
    assertEquals(out[0].eventName, event);

    const good = mac("msg_1", nowSec(), b);
    const ts = nowSec();
    for (const bad of flips(mac("msg_1", ts, b))) {
      const err = await rejects(() => ingest(t, call(b, headersFor(b, ts, `v1,${bad}`))));
      nodeAssert.equal(err.message.includes(bad) || err.message.includes(good), false);
    }
    // a changed body under the original signature; a signature under another key
    await rejects(() => ingest(t, call(b.replace("user-1", "user-2"), headersFor(b, ts))));
    await rejects(() =>
      ingest(t, call(b, headersFor(b, ts, `v1,${mac("msg_1", ts, b, Buffer.alloc(32, 3))}`)))
    );
    // headers missing, raw body absent, stale and future timestamps
    for (const h of ["webhook-id", "webhook-timestamp", "webhook-signature"]) {
      const headers: Record<string, string> = { ...headersFor(b, ts) };
      delete headers[h];
      await rejects(() => ingest(t, call(b, headers)));
    }
    const raw = await rejects(() => ingest(t, call(undefined, headersFor(b, ts))));
    nodeAssert.equal(raw.message.includes("raw body"), true);
    for (const stale of [ts - 3600, ts + 3600]) {
      const err = await rejects(() => ingest(t, call(b, headersFor(b, stale))));
      nodeAssert.equal(err.message.includes("timestamp"), true);
    }
    // unset / empty secret is refused before any compare
    for (const signingSecret of [undefined, ""]) {
      const err = await rejects(() =>
        ingest(
          t,
          call(b, { "webhook-id": "", "webhook-timestamp": "", "webhook-signature": "" }, {
            signingSecret,
          }),
        )
      );
      nodeAssert.equal(err.message.includes("secret"), true);
    }
    // a different configured secret does not verify
    await rejects(() => ingest(t, call(b, headersFor(b, ts), { signingSecret: WRONG })));
    nodeAssert.ok(t.output.length > 0 && t.sample !== undefined);
  });
}

test("posthog: a named trigger ignores other events; any-event filters on its Events param", async () => {
  const other = body("$autocapture");
  assertEquals(evs(await ingest(pageview, call(other, headersFor(other)))), []);
  assertEquals(evs(await ingest(personIdentified, call(other, headersFor(other)))), []);
  assertEquals(evs(await ingest(featureFlagCalled, call(other, headersFor(other)))), []);
  // any-event: no filter = every event; filter = only the named ones
  assertEquals(evs(await ingest(anyEvent, call(other, headersFor(other)))).length, 1);
  const only = { signingSecret: SECRET, events: " $pageview, signed_up " };
  assertEquals(evs(await ingest(anyEvent, call(other, headersFor(other), only))), []);
  const hit = body("signed_up");
  assertEquals(evs(await ingest(anyEvent, call(hit, headersFor(hit), only))).length, 1);
  // a delivery with no event name cannot match a filter
  const nameless = `{ "distinct_id" : "u1" }`;
  assertEquals(evs(await ingest(anyEvent, call(nameless, headersFor(nameless), only))), []);
});

test("posthog: manual webhook onSubscribe makes no vendor call and returns the callback URL", () => {
  for (const t of [pageview, personIdentified, featureFlagCalled, anyEvent]) {
    const out = t.onSubscribe!(
      { params: {}, callbackUrl: "https://cb.example/x", subscriptionId: "s", hostUrl: "h" },
      mockCtx().ctx,
    );
    assertEquals(out, { callbackUrl: "https://cb.example/x" });
  }
});

const conn = { display: { region: "us", projectId: "999" } };
const input = { params: {}, subscriptionId: "sub" };
const page = (results: unknown[], next: string | null = null) => ({
  count: results.length,
  next,
  results,
});
const cohort = (id: number) => ({ id, name: `c${id}`, count: 1 });
const flag = (id: number) => ({ id, key: `f${id}`, name: `Flag ${id}`, active: true });
const insight = (id: number, at: string) => ({ id, name: `i${id}`, last_modified_at: at });

test("posthog new-cohort: seed, new cohort once, idempotent, literal paged requests", async () => {
  const seed = mockCtx([{ body: page([cohort(1)]) }], { connection: conn });
  const seeded = await newCohort.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://us.posthog.com/api/projects/999/cohorts/?limit=100&offset=0"],
  ]);
  const b = page([cohort(2), cohort(1)]);
  const first = await newCohort.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: b }], { connection: conn }).ctx,
  );
  assertEquals(first.events, [cohort(2)]);
  const retry = await newCohort.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: b }], { connection: conn }).ctx,
  );
  assertEquals(retry, first);
  const two = mockCtx([{ body: page([cohort(1)], "https://us.posthog.com/next") }, {
    body: page([cohort(3)]),
  }], { connection: conn });
  const paged = await newCohort.poll!({ ...input, state: seeded.nextState }, two.ctx);
  assertEquals(paged.events, [cohort(3)]);
  assertEquals(
    two.calls[1].url,
    "https://us.posthog.com/api/projects/999/cohorts/?limit=100&offset=100",
  );
});

test("posthog new-feature-flag: seed, new flag once, idempotent, literal request", async () => {
  const seed = mockCtx([{ body: page([flag(1)]) }], { connection: conn });
  const seeded = await newFeatureFlag.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  const b = page([flag(1), flag(2)]);
  const m = mockCtx([{ body: b }], { connection: conn });
  const first = await newFeatureFlag.poll!({ ...input, state: seeded.nextState }, m.ctx);
  assertEquals(first.events, [flag(2)]);
  assertEquals(m.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://us.posthog.com/api/projects/999/feature_flags/?limit=100&offset=0"],
  ]);
  const retry = await newFeatureFlag.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: b }], { connection: conn }).ctx,
  );
  assertEquals(retry, first);
});

test("posthog new-or-updated-insight: newest-modified first, an edit of an old insight is an event", async () => {
  const seed = mockCtx([{ body: page([insight(1, "2026-11-01T00:00:00Z")]) }], {
    connection: conn,
  });
  const seeded = await newOrUpdatedInsight.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const url = new URL(seed.calls[0].url);
  assertEquals(url.origin + url.pathname, "https://us.posthog.com/api/projects/999/insights/");
  assertEquals(Object.fromEntries(url.searchParams), {
    saved: "true",
    basic: "true",
    order: "-last_modified_at",
    limit: "100",
    offset: "0",
  });
  // a brand-new insight and an EDIT of insight 1 (same id, new last_modified_at)
  const b = page([
    insight(2, "2026-11-10T09:00:00Z"),
    insight(1, "2026-11-09T09:00:00Z"),
    insight(1, "2026-11-01T00:00:00Z"),
  ]);
  const first = await newOrUpdatedInsight.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: b }], { connection: conn }).ctx,
  );
  assertEquals(first.events.map((e) => (e as { id: number }).id), [1, 2]);
  const retry = await newOrUpdatedInsight.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: b }], { connection: conn }).ctx,
  );
  assertEquals(retry, first);
});
