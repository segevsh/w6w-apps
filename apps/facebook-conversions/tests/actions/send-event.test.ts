import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/send-event.ts";

const EM = "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b"; // test@example.com
const OK = { body: { events_received: 1, messages: [], fbtrace_id: "trace-1" } };

function eventFrom(body: Record<string, unknown>): Record<string, unknown> {
  const data = body.data as Record<string, unknown>[];
  return data[0];
}

Deno.test("send-event: POSTs /{datasetId}/events with a JSON data array", async () => {
  const { ctx, calls } = mockCtx([OK]);
  const result = await action.execute(
    { eventName: "Purchase", userData: { email: "test@example.com" } },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "graph.facebook.com");
  assertEquals(url.pathname, "/v25.0/1234567890/events");
  const body = jsonBody(calls[0]);
  assertEquals((body.data as unknown[]).length, 1);
  assertEquals(result, { events_received: 1, messages: [], fbtrace_id: "trace-1" });
});

Deno.test("send-event: hashes the email before it leaves the app", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({ eventName: "Lead", userData: { email: "TEST@Example.com" } }, ctx);
  const event = eventFrom(jsonBody(calls[0]));
  assertEquals((event.user_data as Record<string, unknown>).em, EM);
  assertEquals(calls[0].body!.includes("test@example.com"), false);
  assertEquals(calls[0].body!.includes("@"), false);
});

Deno.test("send-event: maps the friendly form keys onto Meta's user_data keys", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({
    eventName: "Purchase",
    userData: {
      email: "test@example.com",
      phone: "+1 650 555 1234",
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "1985-04-12",
      gender: "f",
      city: "New York",
      state: "CA",
      zip: "94025-1234",
      country: "US",
      externalId: "customer-42",
      clientIpAddress: "203.0.113.7",
      clientUserAgent: "Mozilla/5.0",
      fbc: "fb.1.1554763741205.AbCdEfGh",
      fbp: "fb.1.1558571054389.1098115397",
      subscriptionId: "sub-9",
      leadId: "lead-9",
    },
  }, ctx);
  const userData = eventFrom(jsonBody(calls[0])).user_data as Record<string, unknown>;
  assertEquals(Object.keys(userData).sort(), [
    "client_ip_address",
    "client_user_agent",
    "country",
    "ct",
    "db",
    "em",
    "external_id",
    "fbc",
    "fbp",
    "fn",
    "ge",
    "lead_id",
    "ln",
    "ph",
    "st",
    "subscription_id",
    "zp",
  ]);
  assertEquals(userData.client_ip_address, "203.0.113.7");
  assertEquals(userData.external_id, "customer-42");
});

Deno.test("send-event: defaults event_time to now and event_id to the invocation id", async () => {
  const before = Math.floor(Date.now() / 1000);
  const { ctx, calls } = mockCtx([OK], { invocationId: "inv-xyz" });
  await action.execute({ eventName: "Lead", userData: { email: "test@example.com" } }, ctx);
  const event = eventFrom(jsonBody(calls[0]));
  assertEquals(event.event_id, "inv-xyz");
  assert(typeof event.event_time === "number" && event.event_time >= before);
  assertEquals(event.action_source, "website");
});

Deno.test("send-event: honours an explicit event id, time and action source", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({
    eventName: "Purchase",
    eventId: "order-1001",
    eventTime: 1762902353,
    actionSource: "physical_store",
    eventSourceUrl: "https://example.com/checkout",
    optOut: true,
    userData: { email: "test@example.com" },
  }, ctx);
  const event = eventFrom(jsonBody(calls[0]));
  assertEquals(event.event_id, "order-1001");
  assertEquals(event.event_time, 1762902353);
  assertEquals(event.action_source, "physical_store");
  assertEquals(event.event_source_url, "https://example.com/checkout");
  assertEquals(event.opt_out, true);
});

Deno.test("send-event: merges value/currency into custom_data", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({
    eventName: "Purchase",
    value: 123.45,
    currency: "usd",
    customData: { order_id: "1001", content_ids: ["sku-1"] },
    userData: { email: "test@example.com" },
  }, ctx);
  assertEquals(eventFrom(jsonBody(calls[0])).custom_data, {
    order_id: "1001",
    content_ids: ["sku-1"],
    value: 123.45,
    currency: "usd",
  });
});

Deno.test("send-event: omits custom_data entirely when nothing was supplied", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({ eventName: "Lead", userData: { email: "test@example.com" } }, ctx);
  assertEquals("custom_data" in eventFrom(jsonBody(calls[0])), false);
});

Deno.test("send-event: accepts JSON params as strings", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({
    eventName: "Lead",
    userData: { email: "test@example.com" },
    customData: '{"order_id":"1001"}',
    userDataExtra: '{"ig_sid":"178414"}',
  }, ctx);
  const event = eventFrom(jsonBody(calls[0]));
  assertEquals(event.custom_data, { order_id: "1001" });
  assertEquals((event.user_data as Record<string, unknown>).ig_sid, "178414");
});

Deno.test("send-event: test_event_code rides at the top level, not on the event", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({
    eventName: "Lead",
    testEventCode: "TEST12345",
    userData: { email: "test@example.com" },
  }, ctx);
  const body = jsonBody(calls[0]);
  assertEquals(body.test_event_code, "TEST12345");
  assertEquals("test_event_code" in eventFrom(body), false);
});

Deno.test("send-event: splits data processing options into an array", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({
    eventName: "Lead",
    dataProcessingOptions: "LDU",
    dataProcessingOptionsCountry: 1,
    dataProcessingOptionsState: 1000,
    userData: { email: "test@example.com" },
  }, ctx);
  const event = eventFrom(jsonBody(calls[0]));
  assertEquals(event.data_processing_options, ["LDU"]);
  assertEquals(event.data_processing_options_country, 1);
  assertEquals(event.data_processing_options_state, 1000);
});

Deno.test("send-event: pre-hashed mode rejects raw PII without making a request", async () => {
  const { ctx, calls } = mockCtx();
  const err = await assertRejects(
    () =>
      Promise.resolve(
        action.execute(
          { eventName: "Lead", hashing: "pre-hashed", userData: { email: "test@example.com" } },
          ctx,
        ),
      ),
    Error,
  );
  assertStringIncludes(err.message, "raw email address");
  assertEquals(calls.length, 0);
});

Deno.test("send-event: pre-hashed mode forwards an existing digest", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute(
    { eventName: "Lead", hashing: "pre-hashed", userData: { email: EM } },
    ctx,
  );
  assertEquals((eventFrom(jsonBody(calls[0])).user_data as Record<string, unknown>).em, EM);
});

Deno.test("send-event: an empty user_data is rejected without a request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute({ eventName: "Lead" }, ctx)),
    Error,
    "at least one identifier",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-event: an explicit datasetId overrides the connection's", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute(
    { eventName: "Lead", datasetId: "999", userData: { email: "test@example.com" } },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v25.0/999/events");
});

Deno.test("send-event: an OAuth connection with no dataset says so", async () => {
  const { ctx, calls } = mockCtx([], { dataset: null, auth: "oauth2" });
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute({ eventName: "Lead", userData: { email: "test@example.com" } }, ctx),
      ),
    Error,
    "No dataset (pixel) id",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-event: logs identifier names only, never their values", async () => {
  const { ctx, logs } = mockCtx([OK]);
  await action.execute({
    eventName: "Lead",
    userData: { email: "test@example.com", firstName: "John" },
  }, ctx);
  const serialised = JSON.stringify(logs);
  assertStringIncludes(serialised, "em");
  assertEquals(serialised.includes("test@example.com"), false);
  assertEquals(serialised.includes("John"), false);
});

Deno.test("send-event: surfaces Meta's error message on failure", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: { error: { message: "Invalid parameter", code: 100 } } },
  ]);
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute({ eventName: "Lead", userData: { email: "test@example.com" } }, ctx),
      ),
    Error,
    "Invalid parameter",
  );
});

Deno.test("send-event: omits authorization (the runtime injects it)", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({ eventName: "Lead", userData: { email: "test@example.com" } }, ctx);
  assert(!("authorization" in calls[0].headers));
  assertEquals(new URL(calls[0].url).searchParams.get("access_token"), null);
});

Deno.test("send-event: declares itself idempotent (Meta dedupes on event_name + event_id)", () => {
  assertEquals(action.idempotent, true);
  assertEquals(action.type, "perform");
});
