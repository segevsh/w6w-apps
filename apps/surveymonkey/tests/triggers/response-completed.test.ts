import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import trigger from "../../triggers/response-completed.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const CLIENT_ID = "my_client_id";
const CLIENT_SECRET = "my-client-secret-for-tests-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "name" : "w6w sub_1",  "filter_type":"survey", "filter_id":"987",
  "event_type" : "response_completed", "event_id":"5551", "object_type":"response", "object_id":"123456",
  "event_datetime":"2026-11-09T10:15:00.182613+00:00",
  "resources": { "respondent_id":"42", "collector_id":"77", "survey_id":"987", "user_id":"9" } }`;

const sig = (body = BODY, id = CLIENT_ID, secret = CLIENT_SECRET) =>
  createHmac("sha1", `${id}&${secret}`).update(body).digest("base64");

const call = (over: Record<string, unknown> = {}, body: string | null = BODY) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "sm-signature": sig(), "sm-apikey": CLIENT_ID } as Record<string, string>,
    body: body === null ? null : JSON.parse(body),
    ...(body === null ? {} : { rawBody: body }),
    ...over,
  },
  params: { surveyId: "987", clientId: CLIENT_ID, clientSecret: CLIENT_SECRET } as {
    surveyId: string;
    clientId: string | undefined;
    clientSecret: string | undefined;
  },
  state: { webhookId: "W1", surveyId: "987" },
  subscriptionId: "sub_1",
});

const ingest = (input: ReturnType<typeof call>) =>
  trigger.handleIngest!(input as never, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares the webhook trigger with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), ["response-completed"]);
  assert(trigger.output!.length > 0);
  assert(trigger.sample !== undefined);
  assertEquals(typeof trigger.onSubscribe, "function");
  assertEquals(typeof trigger.onUnsubscribe, "function");
  assertEquals(trigger.poll, undefined);
  const secret = trigger.params!.find((p) => p.key === "clientSecret")!;
  assertEquals(secret.type, "secret");
});

test("valid signature → one notification event naming the response", async () => {
  const out = evs(await ingest(call())) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].responseId, "123456");
  assertEquals(out[0].surveyId, "987");
  assertEquals(out[0].eventId, "5551");
});

test("a signed delivery for another survey is acknowledged with no event", async () => {
  const c = call();
  c.state.surveyId = "other";
  assertEquals(evs(await ingest(c)), []);
});

test("a signed delivery of another event type yields no event", async () => {
  const other = BODY.replace("response_completed", "response_updated");
  const c = call({ rawBody: other, headers: { "sm-signature": sig(other) } }, other);
  assertEquals(evs(await ingest(c)), []);
});

test("the HEAD reachability ping is acknowledged with no event", async () => {
  assertEquals(evs(await ingest(call({ method: "HEAD", headers: {} }, null))), []);
});

test("one flipped byte in the body → refused", async () => {
  await assertRejects(
    () => ingest(call({ rawBody: BODY.replace("123456", "123457") })),
    Error,
    "signature",
  );
});

test("signature made with another client secret → refused", async () => {
  const h = { "sm-signature": sig(BODY, CLIENT_ID, "another-secret-xxxxxxxxxxxx") };
  await assertRejects(() => ingest(call({ headers: h })), Error, "signature");
});

test("signature made with the secret alone (no id&) → refused", async () => {
  const bare = createHmac("sha1", CLIENT_SECRET).update(BODY).digest("base64");
  await assertRejects(
    () => ingest(call({ headers: { "sm-signature": bare } })),
    Error,
    "signature",
  );
});

test("header missing → refused", async () => {
  await assertRejects(() => ingest(call({ headers: {} })), Error, "Sm-Signature");
});

test("rawBody absent → refused, even with a correct signature", async () => {
  await assertRejects(() => ingest(call({}, null)), Error, "raw body");
});

test("unset or empty client secret / id + absent or empty header → refused", async () => {
  for (const field of ["clientSecret", "clientId"] as const) {
    for (const value of [undefined, ""]) {
      for (const headers of [{}, { "sm-signature": "" }]) {
        const c = call({ headers });
        c.params[field] = value;
        await assertRejects(() => ingest(c), Error, "secret");
      }
    }
  }
});

test("errors never contain the secret, the signature or the header value", async () => {
  const h = sig(BODY, CLIENT_ID, "another-secret-xxxxxxxxxxxx");
  try {
    await ingest(call({ headers: { "sm-signature": h } }));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(CLIENT_SECRET) && !m.includes(CLIENT_ID) && !m.includes(h));
  }
});

test("a GET is refused", async () => {
  await assertRejects(() => ingest(call({ method: "GET" })), Error, "POST");
});

test("onSubscribe POSTs /v3/webhooks for the survey and returns the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "wh_9", name: "x" } }]);
  const state = await trigger.onSubscribe!(
    {
      params: { surveyId: " 987 ", clientId: CLIENT_ID, clientSecret: CLIENT_SECRET },
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "w6w sub_1",
    event_type: "response_completed",
    object_type: "survey",
    object_ids: ["987"],
    subscription_url: CALLBACK,
  });
  assertEquals(state, { webhookId: "wh_9", surveyId: "987" });
});

test("onSubscribe refuses missing credentials before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      trigger.onSubscribe!(
        {
          params: { surveyId: "987", clientId: CLIENT_ID, clientSecret: "" },
          subscriptionId: "s",
          callbackUrl: CALLBACK,
          hostUrl: "",
        },
        ctx,
      ),
    Error,
    "secret",
  );
  assertEquals(calls.length, 0);
});

test("onUnsubscribe DELETEs the webhook; 404 and 410 are already gone; 500 propagates", async () => {
  const input = {
    params: { surveyId: "987", clientId: CLIENT_ID, clientSecret: CLIENT_SECRET },
    state: { webhookId: "wh_9", surveyId: "987" },
    subscriptionId: "s",
  };
  const ok = mockCtx([{ status: 204 }]);
  await trigger.onUnsubscribe!(input, ok.ctx);
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(new URL(ok.calls[0].url).pathname, "/v3/webhooks/wh_9");
  for (const status of [404, 410]) {
    await trigger.onUnsubscribe!(input, mockCtx([{ status, body: { error: {} } }]).ctx);
  }
  await assertRejects(() =>
    trigger.onUnsubscribe!(input, mockCtx([{ status: 500, body: "x" }]).ctx)
  );
});

test("parseOutput fetches the response details the notification names", async () => {
  const normalized = {
    eventId: "5551",
    eventType: "response_completed",
    name: null,
    responseId: "123456",
    surveyId: "987",
    collectorId: "77",
    respondentId: "42",
    userId: "9",
    eventDatetime: null,
  };
  const { ctx, calls } = mockCtx([{ body: { id: "123456", pages: [] } }]);
  const out = await trigger.parseOutput!({ normalized, call: {} as never }, ctx) as {
    response: unknown;
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/surveys/987/responses/123456/details");
  assertEquals(out.response, { id: "123456", pages: [] });
  const gone = mockCtx([{ status: 404, body: { error: {} } }]);
  const none = await trigger.parseOutput!({ normalized, call: {} as never }, gone.ctx) as {
    response: unknown;
  };
  assertEquals(none.response, null);
});
