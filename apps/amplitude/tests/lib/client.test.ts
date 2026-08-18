import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  AmplitudeClient,
  compact,
  csv,
  deriveInsertId,
  describeDashboard,
  describeIngest,
  HOSTS,
  json,
  MIN_ID_LENGTH,
  regionOf,
  rejectedIndexes,
  shortIds,
} from "../../lib/client.ts";

const display = { region: "US" };

Deno.test("regionOf and HOSTS: four hosts, two per region", () => {
  assertEquals(regionOf("eu"), "EU");
  assertEquals(regionOf(undefined), "US");
  assertEquals(HOSTS.US.ingest, "https://api2.amplitude.com");
  assertEquals(HOSTS.US.query, "https://amplitude.com");
  assertEquals(HOSTS.EU.ingest, "https://api.eu.amplitude.com");
  assertEquals(HOSTS.EU.query, "https://analytics.eu.amplitude.com");
});

Deno.test("compact, csv and json behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [], e: false }), { a: 1, e: false });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
});

/**
 * Ids below five characters are removed rather than refused, so the event is
 * ingested and anonymous.
 */
Deno.test("shortIds: finds the ids Amplitude would silently drop", () => {
  const found = shortIds([
    { user_id: "user-1071", event_type: "a" },
    { user_id: "42", event_type: "b" },
    { device_id: "abc", event_type: "c" },
    { user_id: "abcde", event_type: "d" },
  ]);
  assertEquals(found, [
    { index: 1, field: "user_id", value: "42" },
    { index: 2, field: "device_id", value: "abc" },
  ]);
  assertEquals(MIN_ID_LENGTH, 5);
});

Deno.test("shortIds: an overridden threshold changes what counts as short", () => {
  assertEquals(shortIds([{ user_id: "42" }], 2), []);
  assertEquals(shortIds([{ user_id: "4" }], 2).length, 1);
});

/**
 * Deduplication keys on the id being the SAME across attempts, so a fresh UUID
 * achieves nothing. Deriving it from the content is what makes a retry work.
 */
Deno.test("deriveInsertId: identical payloads give identical ids", async () => {
  const a = await deriveInsertId({ user_id: "user-1", event_type: "Signup" });
  const b = await deriveInsertId({ user_id: "user-1", event_type: "Signup" });
  assertEquals(a, b);
  assertEquals(a.length, 32);
});

Deno.test("deriveInsertId: property order does not change the id", async () => {
  const a = await deriveInsertId({ user_id: "user-1", event_type: "Signup" });
  const b = await deriveInsertId({ event_type: "Signup", user_id: "user-1" });
  assertEquals(a, b);
});

Deno.test("deriveInsertId: different payloads give different ids", async () => {
  const a = await deriveInsertId({ user_id: "user-1", event_type: "Signup" });
  const b = await deriveInsertId({ user_id: "user-2", event_type: "Signup" });
  assert(a !== b, "two different events hashed the same");
});

/** A 400 or 429 names the failed events by index; everything else was accepted. */
Deno.test("rejectedIndexes: unions all four ways a partial failure is reported", () => {
  assertEquals(
    rejectedIndexes({
      events_with_invalid_fields: { time: [0, 3] },
      events_with_missing_fields: { event_type: [1] },
      silenced_events: [3],
      throttled_events: [5],
    }),
    [0, 1, 3, 5],
  );
  assertEquals(rejectedIndexes(null), []);
  assertEquals(rejectedIndexes({ code: 200 }), []);
});

Deno.test("ingest: posts JSON to the ingest host without a credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { code: 200, events_ingested: 1 } }], {
    display,
  });
  await new AmplitudeClient(ctx).ingest({ path: "/2/httpapi", body: { events: [] } });
  assertEquals(calls[0].url, "https://api2.amplitude.com/2/httpapi");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assert(!calls[0].body!.includes("api_key"), "the client set a credential");
});

/** `/identify` is the one form-encoded endpoint in the API. */
Deno.test("ingest: form mode sends x-www-form-urlencoded", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await new AmplitudeClient(ctx).ingest({
    path: "/identify",
    form: true,
    body: { identification: "[]" },
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "identification=%5B%5D");
});

Deno.test("ingest: an EU connection uses the EU ingest host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: { region: "EU" } });
  await new AmplitudeClient(ctx).ingest({ path: "/batch", body: {} });
  assertEquals(calls[0].url, "https://api.eu.amplitude.com/batch");
});

/** A 400 that names indexes is a partial success, not a failure. */
Deno.test("ingest: a partial failure comes back rather than throwing", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { code: 400, events_with_missing_fields: { event_type: [2] } },
  }], { display });
  const result = await new AmplitudeClient(ctx).ingest({ path: "/2/httpapi", body: {} });
  assertEquals(result.partial, true);
  assertEquals(rejectedIndexes(result.body), [2]);
});

/** A 400 that names nothing is a real failure. */
Deno.test("ingest: a whole-request failure throws", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: 400, error: "Invalid API key: x" } }], {
    display,
  });
  let message = "";
  try {
    await new AmplitudeClient(ctx).ingest({ path: "/2/httpapi", body: {} });
  } catch (err) {
    message = String(err);
  }
  assert(/INGEST side/.test(message), message);
  assert(/check the region/.test(message), message);
});

Deno.test("describeIngest: a 429 explains that throttling is per user and partial", () => {
  const message = describeIngest(429, { eps_threshold: 30 }, "");
  assert(/30 events per second/.test(message), message);
  assert(/resend ONLY those/.test(message), message);
});

Deno.test("dashboard: builds the query host URL without a credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], { display });
  await new AmplitudeClient(ctx).dashboard("/api/2/events/list", { query: { a: "b" } });
  assertEquals(calls[0].url, "https://amplitude.com/api/2/events/list?a=b");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("dashboard: an EU connection uses the EU query host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: { region: "EU" } });
  await new AmplitudeClient(ctx).dashboard("/api/2/events/list");
  assert(calls[0].url.startsWith("https://analytics.eu.amplitude.com/"), calls[0].url);
});

/** The API key alone is a write credential, and the message does not say so. */
Deno.test("describeDashboard: a 403 explains the two-key requirement", () => {
  const message = describeDashboard(
    403,
    JSON.stringify({ error: { http_code: 403, metadata: { details: "Invalid API Key" } } }),
  );
  assert(/API key AND the secret key/.test(message), message);
  assert(/write-only credential/.test(message), message);
});

Deno.test("describeDashboard: a 429 names the cost-based limit", () => {
  assert(/cost-limited/.test(describeDashboard(429, "{}")));
});

Deno.test("dashboard: an error throws with the path and the explanation", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { metadata: { details: "Invalid API Key" } } },
  }], {
    display,
  });
  let message = "";
  try {
    await new AmplitudeClient(ctx).dashboard("/api/2/events/list");
  } catch (err) {
    message = String(err);
  }
  assert(/\/api\/2\/events\/list/.test(message), message);
  assert(/secret key/.test(message), message);
});
