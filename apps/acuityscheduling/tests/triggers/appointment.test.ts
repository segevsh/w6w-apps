import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import scheduled from "../../triggers/appointment-scheduled.ts";
import canceled from "../../triggers/appointment-canceled.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const API_KEY = "acuity-api-key-for-tests-0123456789ab";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Form-encoded, as Acuity sends it. Percent-escapes make a decode-and-re-encode round trip differ
// from the bytes signed: new URLSearchParams(BODY).toString() !== BODY.
const BODY = "action=scheduled&id=13&calendarID=1&appointmentTypeID=13&note=a%20b";

const sig = (body = BODY, key = API_KEY) => createHmac("sha256", key).update(body).digest("base64");

const call = (over: Record<string, unknown> = {}, body: string | null = BODY) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "x-acuity-signature": sig() } as Record<string, string>,
    body: body === null ? null : body,
    ...(body === null ? {} : { rawBody: body }),
    ...over,
  },
  params: { apiKey: API_KEY } as { apiKey: string | undefined },
  state: { webhookId: "7", action: "scheduled" },
  subscriptionId: "sub_1",
});

const ingest = (input: ReturnType<typeof call>, t = scheduled) =>
  t.handleIngest!(input as never, mockCtx().ctx);

test("fixture body is not byte-identical to its decode and re-encode", () => {
  assert(new URLSearchParams(BODY).toString() !== BODY);
});

test("app declares three webhook triggers with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "appointment-scheduled",
    "appointment-rescheduled",
    "appointment-canceled",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0, t.key);
    assert(t.sample !== undefined, t.key);
    assertEquals(typeof t.onSubscribe, "function", t.key);
    assertEquals(typeof t.onUnsubscribe, "function", t.key);
    assertEquals(t.poll, undefined, t.key);
    assertEquals(t.params!.find((p) => p.key === "apiKey")!.type, "secret", t.key);
  }
});

test("valid signature → one notification event naming the appointment", async () => {
  const out = evs(await ingest(call())) as Array<Record<string, unknown>>;
  assertEquals(out, [
    { action: "scheduled", appointmentId: "13", calendarId: "1", appointmentTypeId: "13" },
  ]);
});

test("a signed delivery of another action is acknowledged with no event", async () => {
  assertEquals(evs(await ingest(call(), canceled)), []);
});

test("one flipped byte in the body → refused", async () => {
  await assertRejects(
    () => ingest(call({ rawBody: BODY.replace("id=13", "id=14") })),
    Error,
    "signature",
  );
});

test("signature made with another key → refused", async () => {
  const h = { "x-acuity-signature": sig(BODY, "another-api-key-xxxxxxxxxxxxxxx") };
  await assertRejects(() => ingest(call({ headers: h })), Error, "signature");
});

test("header missing → refused", async () => {
  await assertRejects(() => ingest(call({ headers: {} })), Error, "X-Acuity-Signature");
});

test("rawBody absent → refused, even with a correct signature", async () => {
  await assertRejects(() => ingest(call({}, null)), Error, "raw body");
});

test("unset or empty API key + absent or empty header → refused", async () => {
  for (const value of [undefined, ""]) {
    for (const headers of [{}, { "x-acuity-signature": "" }]) {
      const c = call({ headers });
      c.params.apiKey = value;
      await assertRejects(() => ingest(c), Error, "secret");
    }
  }
});

test("a signed body that names no appointment is refused", async () => {
  const b = "action=scheduled";
  await assertRejects(
    () => ingest(call({ rawBody: b, headers: { "x-acuity-signature": sig(b) } }, b)),
    Error,
    "Acuity",
  );
});

test("errors never contain the key, the signature or the header value", async () => {
  const h = sig(BODY, "another-api-key-xxxxxxxxxxxxxxx");
  try {
    await ingest(call({ headers: { "x-acuity-signature": h } }));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(API_KEY) && !m.includes(h));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(() => ingest(call({ method: "GET" })), Error, "POST");
});

test("onSubscribe POSTs /webhooks with the event and target, and returns the id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: 7, event: "appointment.canceled", status: "active" },
  }]);
  const state = await canceled.onSubscribe!(
    {
      params: { apiKey: API_KEY },
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/webhooks");
  assertEquals(JSON.parse(calls[0].body!), { event: "appointment.canceled", target: CALLBACK });
  assertEquals(state, { webhookId: "7", action: "canceled" });
});

test("onSubscribe refuses a missing API key before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      scheduled.onSubscribe!(
        { params: { apiKey: "" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "secret",
  );
  assertEquals(calls.length, 0);
});

test("onUnsubscribe DELETEs the webhook; 404 and 410 are already gone; 500 propagates", async () => {
  const input = {
    params: { apiKey: API_KEY },
    state: { webhookId: "7", action: "scheduled" as const },
    subscriptionId: "s",
  };
  const ok = mockCtx([{ status: 204 }]);
  await scheduled.onUnsubscribe!(input, ok.ctx);
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(new URL(ok.calls[0].url).pathname, "/api/v1/webhooks/7");
  for (const status of [404, 410]) {
    await scheduled.onUnsubscribe!(input, mockCtx([{ status, body: { error: "not_found" } }]).ctx);
  }
  await assertRejects(() =>
    scheduled.onUnsubscribe!(input, mockCtx([{ status: 500, body: "x" }]).ctx)
  );
});

test("parseOutput fetches the appointment; a missing one is null", async () => {
  const normalized = {
    action: "scheduled",
    appointmentId: "13",
    calendarId: "1",
    appointmentTypeId: "13",
  };
  const { ctx, calls } = mockCtx([{ body: { id: 13, email: "ada@example.com" } }]);
  const out = await scheduled.parseOutput!({ normalized, call: {} as never }, ctx) as {
    appointment: unknown;
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/appointments/13");
  assertEquals(out.appointment, { id: 13, email: "ada@example.com" });
  const gone = mockCtx([{ status: 404, body: { error: "not_found" } }]);
  const none = await scheduled.parseOutput!({ normalized, call: {} as never }, gone.ctx) as {
    appointment: unknown;
  };
  assertEquals(none.appointment, null);
});
