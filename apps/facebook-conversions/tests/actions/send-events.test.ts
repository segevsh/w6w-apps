import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/send-events.ts";

const EM = "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b"; // test@example.com
const PH = "6069d14bf122fdfd931dc7beb58e5dfbba395b1faf05bdcd42d12358d63d8599"; // 16505551234
const OK = { body: { events_received: 2, messages: [], fbtrace_id: "trace-2" } };

const EVENTS = [
  {
    event_name: "Purchase",
    event_time: 1762902353,
    action_source: "website",
    event_id: "order-1",
    user_data: { em: "test@example.com" },
    custom_data: { currency: "usd", value: 10 },
  },
  {
    event_name: "Lead",
    event_time: 1762902400,
    action_source: "physical_store",
    event_id: "lead-1",
    user_data: { ph: "+1 (650) 555-1234" },
  },
];

Deno.test("send-events: POSTs the whole batch to /{datasetId}/events", async () => {
  const { ctx, calls } = mockCtx([OK]);
  const result = await action.execute({ events: EVENTS }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v25.0/1234567890/events");
  const data = jsonBody(calls[0]).data as Record<string, unknown>[];
  assertEquals(data.length, 2);
  assertEquals(data[0].event_name, "Purchase");
  assertEquals(data[1].action_source, "physical_store");
  assertEquals(result.events_received, 2);
});

Deno.test("send-events: hashes every event's user_data", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({ events: EVENTS }, ctx);
  const data = jsonBody(calls[0]).data as Record<string, unknown>[];
  assertEquals((data[0].user_data as Record<string, unknown>).em, EM);
  assertEquals((data[1].user_data as Record<string, unknown>).ph, PH);
  assertEquals(calls[0].body!.includes("test@example.com"), false);
  assertEquals(calls[0].body!.includes("650"), false);
});

Deno.test("send-events: preserves every non-user_data member of each event", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({ events: EVENTS }, ctx);
  const data = jsonBody(calls[0]).data as Record<string, unknown>[];
  assertEquals(data[0].event_id, "order-1");
  assertEquals(data[0].event_time, 1762902353);
  assertEquals(data[0].custom_data, { currency: "usd", value: 10 });
});

Deno.test("send-events: accepts the array as a JSON string", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({ events: JSON.stringify(EVENTS) }, ctx);
  assertEquals((jsonBody(calls[0]).data as unknown[]).length, 2);
});

Deno.test("send-events: rejects invalid JSON, a non-array, and an empty array", async () => {
  for (const events of ["{oops", { not: "an array" }, []]) {
    const { ctx, calls } = mockCtx();
    await assertRejects(() => Promise.resolve(action.execute({ events }, ctx)), Error);
    assertEquals(calls.length, 0);
  }
});

Deno.test("send-events: refuses more than 1000 events rather than letting Meta reject them", async () => {
  const { ctx, calls } = mockCtx();
  const events = Array.from({ length: 1001 }, () => EVENTS[0]);
  await assertRejects(
    () => Promise.resolve(action.execute({ events }, ctx)),
    Error,
    "at most 1000",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-events: a raw value under pre-hashed fails the whole batch, naming the index", async () => {
  const { ctx, calls } = mockCtx();
  const err = await assertRejects(
    () => Promise.resolve(action.execute({ events: EVENTS, hashing: "pre-hashed" }, ctx)),
    Error,
  );
  assertStringIncludes(err.message, "data[0]");
  assertStringIncludes(err.message, "raw email address");
  assertEquals(calls.length, 0);
});

Deno.test("send-events: an event missing user_data is rejected by index", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute({ events: [EVENTS[0], { event_name: "Lead" }] }, ctx),
      ),
    Error,
    "data[1]",
  );
});

Deno.test("send-events: test_event_code rides at the top level", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({ events: EVENTS, testEventCode: "TEST12345" }, ctx);
  assertEquals(jsonBody(calls[0]).test_event_code, "TEST12345");
});

Deno.test("send-events: honours an explicit datasetId", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({ events: EVENTS, datasetId: "555" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v25.0/555/events");
});

Deno.test("send-events: omits authorization (the runtime injects it)", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute({ events: EVENTS }, ctx);
  assert(!("authorization" in calls[0].headers));
});

Deno.test("send-events: declares itself non-idempotent — the caller owns event_id", () => {
  assertEquals(action.idempotent, false);
  assertEquals(action.type, "perform");
});
