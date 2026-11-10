import { test } from "node:test";
import { createHash, createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import deployStarted from "../../triggers/deploy-started.ts";
import submissionCreated from "../../triggers/submission-created.ts";
import newSite from "../../triggers/new-site.ts";
import newForm from "../../triggers/new-form.ts";

const SECRET = "test-secret";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const b64u = (v: string | Buffer) => Buffer.from(v).toString("base64url");

const DEPLOY =
  `{ "id" : "d1", "site_id":"site-1",  "name": "my-site",\n "state" : "building", "branch":"main" }`;
const SUB =
  `{ "id" : "s1", "form_id":"f1",  "form_name": "contact",\n "email" : "ada@example.test", "data": {"message": "hi"} }`;

function jws(body: string, secret = SECRET): string {
  const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64u(JSON.stringify({
    iss: "netlify",
    sha256: createHash("sha256").update(body).digest("hex"),
  }));
  return `${h}.${p}.${createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`;
}

function call(rawBody: string | undefined, headers: Record<string, string>): TriggerCall {
  const c: TriggerCall = {
    method: "POST",
    path: "/x",
    query: {},
    headers,
    body: rawBody === undefined ? null : JSON.parse(rawBody),
  };
  if (rawBody !== undefined) c.rawBody = rawBody;
  return c;
}

const ingest = (
  t: typeof submissionCreated,
  raw: TriggerCall,
  params: Record<string, unknown>,
) =>
  t.handleIngest!({ raw, params, state: { callbackUrl: "u" }, subscriptionId: "s" }, mockCtx().ctx);

test("deploy-started keeps only state building, signature verified", async () => {
  const sig = { "x-webhook-signature": jws(DEPLOY) };
  const out = evs(
    await deployStarted.handleIngest!(
      {
        raw: call(DEPLOY, sig),
        params: { signingSecret: SECRET },
        state: { callbackUrl: "u" },
        subscriptionId: "s",
      },
      mockCtx().ctx,
    ),
  );
  assertEquals((out[0] as { state: string }).state, "building");
  const ready = DEPLOY.replace("building", "ready");
  assertEquals(
    evs(
      await deployStarted.handleIngest!(
        {
          raw: call(ready, { "x-webhook-signature": jws(ready) }),
          params: { signingSecret: SECRET },
          state: { callbackUrl: "u" },
          subscriptionId: "s",
        },
        mockCtx().ctx,
      ),
    ),
    [],
  );
  const t = jws(DEPLOY);
  await assertRejects(
    () =>
      deployStarted.handleIngest!(
        {
          raw: call(DEPLOY, {
            "x-webhook-signature": t.slice(0, -1) + (t.endsWith("A") ? "B" : "A"),
          }),
          params: { signingSecret: SECRET },
          state: { callbackUrl: "u" },
          subscriptionId: "s",
        },
        mockCtx().ctx,
      ),
    Error,
    "signature does not match",
  );
  await assertRejects(
    () =>
      deployStarted.handleIngest!(
        { raw: call(DEPLOY, sig), params: {}, state: { callbackUrl: "u" }, subscriptionId: "s" },
        mockCtx().ctx,
      ),
    Error,
    "secret",
  );
});

test("submission-created with a secret: valid -> event; flipped signature byte, missing header, missing rawBody, empty-key forgery refused", async () => {
  const params = { signingSecret: SECRET };
  const good = { "x-webhook-signature": jws(SUB) };
  assertEquals(JSON.stringify(JSON.parse(SUB)) !== SUB, true);
  const out = evs(await ingest(submissionCreated, call(SUB, good), params));
  assertEquals(out, [{
    submissionId: "s1",
    formId: "f1",
    formName: "contact",
    siteUrl: null,
    name: null,
    email: "ada@example.test",
    summary: null,
    data: { message: "hi" },
    createdAt: null,
    submission: JSON.parse(SUB),
  }]);
  const t = jws(SUB);
  const flipped = t.slice(0, -1) + (t.endsWith("A") ? "B" : "A");
  await assertRejects(
    () => ingest(submissionCreated, call(SUB, { "x-webhook-signature": flipped }), params),
    Error,
    "signature does not match",
  );
  await assertRejects(
    () => ingest(submissionCreated, call(SUB.replace("ada", "eve"), good), params),
    Error,
    "body hash",
  );
  await assertRejects(
    () => ingest(submissionCreated, call(SUB, {}), params),
    Error,
    "no signature",
  );
  await assertRejects(
    () => ingest(submissionCreated, call(undefined, good), params),
    Error,
    "raw body",
  );
  await assertRejects(
    () =>
      ingest(submissionCreated, call(SUB, { "x-webhook-signature": jws(SUB, "other") }), params),
    Error,
    "signature does not match",
  );
});

test("submission-created without a secret: the unsigned body is accepted, the form filter applies, rawBody is still required", async () => {
  assertEquals(evs(await ingest(submissionCreated, call(SUB, {}), {})).length, 1);
  assertEquals(
    evs(await ingest(submissionCreated, call(SUB, {}), { signingSecret: "" })).length,
    1,
  );
  assertEquals(evs(await ingest(submissionCreated, call(SUB, {}), { formName: "other" })), []);
  assertEquals(
    evs(await ingest(submissionCreated, call(SUB, {}), { formName: "contact" })).length,
    1,
  );
  await assertRejects(() => ingest(submissionCreated, call(undefined, {}), {}), Error, "raw body");
  await assertRejects(
    () => ingest(submissionCreated, { ...call(SUB, {}), method: "GET" }, {}),
    Error,
    "POST",
  );
});

const SITES_URL = "https://api.netlify.com/api/v1/sites?per_page=100&page=1";
const input = { params: {}, subscriptionId: "s" };

test("new-site: seed, one new site, idempotent, literal request", async () => {
  const seed = mockCtx([{ body: [{ id: "a" }] }]);
  const seeded = await newSite.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, SITES_URL);
  const run = () =>
    newSite.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: [{ id: "a" }, { id: "b" }] }]).ctx,
    );
  const a = await run();
  assertEquals(a.events.map((e) => (e as { key: string }).key), ["b"]);
  assertEquals(a, await run());
});

test("new-site: pages through full pages, and fails loudly past the cap", async () => {
  const page = (from: number, n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `s${from + i}` }));
  const m = mockCtx([{ body: page(0, 100) }, { body: page(100, 3) }]);
  await newSite.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.map((c) => c.url), [
    SITES_URL,
    "https://api.netlify.com/api/v1/sites?per_page=100&page=2",
  ]);
  const full = Array.from({ length: 10 }, (_, p) => ({ body: page(p * 100, 100) }));
  await assertRejects(
    () => newSite.poll!({ ...input, state: {} }, mockCtx(full).ctx),
    Error,
    "1000 sites",
  );
});

test("new-form: seed, one new form, idempotent, literal request, siteId required", async () => {
  const withSite = { params: { siteId: "site 1" }, subscriptionId: "s" };
  const seed = mockCtx([{ body: [{ id: "f1" }] }]);
  const seeded = await newForm.poll!({ ...withSite, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.netlify.com/api/v1/sites/site%201/forms");
  const run = () =>
    newForm.poll!(
      { ...withSite, state: seeded.nextState },
      mockCtx([{ body: [{ id: "f1" }, { id: "f2" }] }]).ctx,
    );
  const a = await run();
  assertEquals(a.events.map((e) => (e as { key: string }).key), ["f2"]);
  assertEquals(a, await run());
  await assertRejects(() => newForm.poll!({ ...input, state: {} }, mockCtx().ctx), Error, "siteId");
});
