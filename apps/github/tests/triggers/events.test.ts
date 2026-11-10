import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import { parseEventNames } from "../../lib/triggers.ts";

/**
 * The webhook triggers added in round 3: one GitHub event each, plus the any-event trigger.
 * GitHub's scheme has no timestamp: `X-Hub-Signature-256` is `sha256=` + hex HMAC of the raw body.
 * The expected signature is computed by node:crypto; the body is non-canonical JSON.
 */

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const SECRET = "test-secret";

/** [trigger key, the GitHub event it registers for, whether it has the `actions` filter]. */
const CASES: Array<[string, string, boolean]> = [
  ["pull-request-review", "pull_request_review", true],
  ["pull-request-review-comment", "pull_request_review_comment", true],
  ["ref-created", "create", false],
  ["ref-deleted", "delete", false],
  ["repository-event", "repository", true],
  ["workflow-job", "workflow_job", true],
  ["star", "star", true],
  ["fork", "fork", false],
];

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const sign = (body: string, secret = SECRET) =>
  "sha256=" + createHmac("sha256", secret).update(body).digest("hex");

/** Non-canonical whitespace: `JSON.stringify(JSON.parse(BODY)) !== BODY`. */
const BODY =
  `{ "action" : "created",\n  "ref":"main",  "repository": {"full_name":"octocat/Hello-World"}, "sender" : {"login":"octocat"} }`;

function call(rawBody: string | undefined, headers: Record<string, string>): TriggerCall {
  const c: TriggerCall = {
    method: "POST",
    path: "/triggers/webhooks/sub_abc",
    query: {},
    headers,
    body: rawBody === undefined ? null : JSON.parse(rawBody),
  };
  if (rawBody !== undefined) c.rawBody = rawBody;
  return c;
}

const headersFor = (event: string, body = BODY) => ({
  "x-github-event": event,
  "x-github-delivery": "72d3162e-cc78",
  "x-hub-signature-256": sign(body),
});

const trigger = (key: string) => {
  const t = (app.triggers ?? []).find((x) => x.key === key);
  assert(t !== undefined, key);
  return t;
};

function ingest(
  key: string,
  raw: TriggerCall,
  state: Record<string, unknown> | undefined,
  params: Record<string, unknown> = {},
) {
  return trigger(key).handleIngest!(
    { raw, params, state: state as never, subscriptionId: "s" },
    mockCtx().ctx,
  );
}

const stateFor = (event: string, extra: Record<string, unknown> = {}) => ({
  hookId: "12345678",
  owner: "octocat",
  repository: "Hello-World",
  event,
  secret: SECRET,
  ...extra,
});

for (const [key, event, hasActions] of CASES) {
  const state = stateFor(event);

  test(`${key}: declared with output, a sample and the webhook lifecycle`, () => {
    const t = trigger(key);
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
    assertEquals(typeof (t as { poll?: unknown }).poll, "undefined");
    assertEquals(
      t.params!.map((p) => p.key),
      hasActions ? ["owner", "repository", "actions"] : ["owner", "repository"],
    );
    assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
  });

  test(`${key}: registers one hook for the ${event} event (literal request)`, async () => {
    const { ctx, calls } = mockCtx([{ body: [] }, { status: 201, body: { id: 77 } }]);
    const out = await trigger(key).onSubscribe!(
      { params: { owner: "octocat", repository: "Hello-World" }, callbackUrl: CALLBACK },
      ctx,
    ) as { secret: string };
    assertEquals([calls[1].method, calls[1].url], [
      "POST",
      "https://api.github.com/repos/octocat/Hello-World/hooks",
    ]);
    assertEquals(JSON.parse(calls[1].body!), {
      name: "web",
      active: true,
      events: [event],
      config: { url: CALLBACK, content_type: "json", secret: out.secret, insecure_ssl: "0" },
    });
    assertEquals(out, {
      hookId: "77",
      owner: "octocat",
      repository: "Hello-World",
      event,
      secret: out.secret,
    });
  });

  test(`${key}: a valid signature over the exact bytes yields the event`, async () => {
    const out = evs(await ingest(key, call(BODY, headersFor(event)), state));
    assertEquals(out.length, 1);
    assertEquals((out[0] as { event: string }).event, event);
    assertEquals((out[0] as { repository: string }).repository, "octocat/Hello-World");
    assertEquals((out[0] as { deliveryId: string }).deliveryId, "72d3162e-cc78");
  });

  test(`${key}: a flipped byte, a missing header and an absent rawBody are refused`, async () => {
    const tampered = BODY.replace('"main"', '"mam"');
    await assertRejects(
      async () => await ingest(key, call(tampered, headersFor(event, BODY)), state),
      Error,
      "signature",
    );
    const sig = sign(BODY);
    const flipped = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    await assertRejects(
      async () =>
        await ingest(
          key,
          call(BODY, { ...headersFor(event), "x-hub-signature-256": flipped }),
          state,
        ),
      Error,
      "signature",
    );
    await assertRejects(
      async () => await ingest(key, call(BODY, { "x-github-event": event }), state),
      Error,
      "signature",
    );
    await assertRejects(
      async () => await ingest(key, call(undefined, headersFor(event)), state),
      Error,
      "raw body",
    );
    const canonical = JSON.stringify(JSON.parse(BODY));
    await assertRejects(
      async () =>
        await ingest(
          key,
          call(BODY, { ...headersFor(event), "x-hub-signature-256": sign(canonical) }),
          state,
        ),
      Error,
      "signature",
    );
  });

  test(`${key}: an unset or empty secret is refused first, signature or not`, async () => {
    for (const secret of [undefined, ""]) {
      await assertRejects(
        async () => await ingest(key, call(BODY, {}), { ...state, secret }),
        Error,
        "secret",
      );
      await assertRejects(
        async () => await ingest(key, call(BODY, headersFor(event)), { ...state, secret }),
        Error,
        "secret",
      );
    }
  });

  test(`${key}: ping and an event of another type yield none (verified first)`, async () => {
    assertEquals(evs(await ingest(key, call(BODY, headersFor("ping")), state)), []);
    assertEquals(evs(await ingest(key, call(BODY, headersFor("deployment")), state)), []);
  });

  if (hasActions) {
    test(`${key}: the actions filter keeps only the named actions`, async () => {
      const raw = call(BODY, headersFor(event));
      assertEquals(evs(await ingest(key, raw, state, { actions: "created" })).length, 1);
      assertEquals(evs(await ingest(key, raw, state, { actions: " deleted , edited" })), []);
      assertEquals(evs(await ingest(key, raw, state, { actions: "" })).length, 1);
    });
  }
}

// ── any-event ───────────────────────────────────────────────────────────────

test("any-event: owner, repository and events params; no actions filter", () => {
  const t = trigger("any-event");
  assertEquals(t.params!.map((p) => p.key), ["owner", "repository", "events"]);
  assert(t.output!.length > 0);
  assertEquals((t.sample as { event: string }).event, "check_run");
  assertEquals((t.sample as { action: string }).action, "completed");
});

test("parseEventNames: blank and * mean every event; names are trimmed, de-duplicated, validated", () => {
  assertEquals(parseEventNames(undefined), ["*"]);
  assertEquals(parseEventNames("  "), ["*"]);
  assertEquals(parseEventNames("*"), ["*"]);
  assertEquals(parseEventNames("check_run, label , check_run"), ["check_run", "label"]);
  assertEquals(parseEventNames("check_run,*"), ["*"]);
  for (const bad of ["Check Run", "check-run", "x".repeat(70), "a;b"]) {
    assertEquals(
      (() => {
        try {
          parseEventNames(bad);
          return "no throw";
        } catch (e) {
          return (e as Error).message.includes("not a GitHub webhook event name");
        }
      })(),
      true,
      bad,
    );
  }
});

test("any-event: onSubscribe with a blank list registers [*]; a list registers exactly it", async () => {
  for (
    const [params, expected] of [
      [{}, ["*"]],
      [{ events: "check_run, label" }, ["check_run", "label"]],
    ] as Array<[Record<string, unknown>, string[]]>
  ) {
    const { ctx, calls } = mockCtx([{ body: [] }, { status: 201, body: { id: 5 } }]);
    const out = await trigger("any-event").onSubscribe!(
      { params: { owner: "octocat", repository: "Hello-World", ...params }, callbackUrl: CALLBACK },
      ctx,
    ) as { secret: string };
    assertEquals(calls[1].url, "https://api.github.com/repos/octocat/Hello-World/hooks");
    assertEquals(JSON.parse(calls[1].body!), {
      name: "web",
      active: true,
      events: expected,
      config: { url: CALLBACK, content_type: "json", secret: out.secret, insecure_ssl: "0" },
    });
    assertEquals(out, {
      hookId: "5",
      owner: "octocat",
      repository: "Hello-World",
      event: expected.join(","),
      events: expected,
      secret: out.secret,
    });
  }
});

test("any-event: an invalid event name registers nothing", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await trigger("any-event").onSubscribe!(
        { params: { owner: "o", repository: "r", events: "Check Run" }, callbackUrl: CALLBACK },
        ctx,
      ),
    Error,
    "not a GitHub webhook event name",
  );
  assertEquals(calls.length, 0);
});

test("any-event: the stored event list filters; * passes everything but ping", async () => {
  const some = stateFor("check_run,label", { events: ["check_run", "label"] });
  const all = stateFor("*", { events: ["*"] });
  const out = evs(await ingest("any-event", call(BODY, headersFor("label")), some));
  assertEquals(out.length, 1);
  assertEquals((out[0] as { event: string }).event, "label");
  assertEquals((out[0] as { action: string }).action, "created");
  assertEquals(evs(await ingest("any-event", call(BODY, headersFor("push")), some)), []);
  assertEquals(evs(await ingest("any-event", call(BODY, headersFor("push")), all)).length, 1);
  assertEquals(evs(await ingest("any-event", call(BODY, headersFor("ping")), all)), []);
  // no stored list at all: nothing passes
  assertEquals(evs(await ingest("any-event", call(BODY, headersFor("push")), stateFor("x"))), []);
});

test("any-event: signature failures are refused before the event filter", async () => {
  const some = stateFor("check_run", { events: ["check_run"] });
  const tampered = BODY.replace('"main"', '"mam"');
  await assertRejects(
    async () => await ingest("any-event", call(tampered, headersFor("push", BODY)), some),
    Error,
    "signature",
  );
  await assertRejects(
    async () => await ingest("any-event", call(BODY, { "x-github-event": "push" }), some),
    Error,
    "signature",
  );
  await assertRejects(
    async () => await ingest("any-event", call(undefined, headersFor("push")), some),
    Error,
    "raw body",
  );
  for (const secret of [undefined, ""]) {
    await assertRejects(
      async () =>
        await ingest("any-event", call(BODY, headersFor("check_run")), { ...some, secret }),
      Error,
      "secret",
    );
  }
});
