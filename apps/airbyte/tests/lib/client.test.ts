import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  AirbyteClient,
  assertUuid,
  CLOUD_HOST,
  compact,
  csv,
  describeError,
  hostFromConnection,
  isJobHealthy,
  jobDurationSeconds,
  json,
  normalizeHost,
  query,
  UNHEALTHY_JOB_STATUSES,
} from "../../lib/client.ts";

const UUID = "e735894a-e773-4938-969f-45f53957b75b";
const D = { display: { host: CLOUD_HOST } };

Deno.test("request: builds the v1 path under the connection's host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], D);
  await new AirbyteClient(ctx).request("/connections");
  assertEquals(calls[0].url, "https://api.airbyte.com/v1/connections");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("hostFromConnection and normalizeHost default to Airbyte Cloud", () => {
  assertEquals(hostFromConnection(undefined), CLOUD_HOST);
  assertEquals(hostFromConnection({ display: {} }), CLOUD_HOST);
  assertEquals(
    hostFromConnection({ display: { host: "https://airbyte.internal" } }),
    "https://airbyte.internal",
  );
  assertEquals(normalizeHost(""), CLOUD_HOST);
  assertEquals(normalizeHost("airbyte.internal"), "https://airbyte.internal");
  assertEquals(normalizeHost("https://airbyte.internal/v1"), "https://airbyte.internal");
  assertEquals(normalizeHost("https://airbyte.internal/api/public/v1"), "https://airbyte.internal");
});

/** `succeeded` is the only status that means the data all arrived. */
Deno.test("isJobHealthy: incomplete is not success", () => {
  assertEquals(isJobHealthy("succeeded"), true);
  for (const status of UNHEALTHY_JOB_STATUSES) {
    assertEquals(isJobHealthy(status), false, status);
  }
  assertEquals(isJobHealthy("incomplete"), false, "the one that gets missed");
  assertEquals(isJobHealthy(undefined), false);
});

Deno.test("assertUuid: every Airbyte id is a UUID, and says where to find one", () => {
  assertEquals(assertUuid(UUID.toUpperCase(), "connectionId"), UUID);
  const err = assertThrows(() => assertUuid("12345", "connectionId"), Error);
  assert(/must be a UUID/.test(err.message), err.message);
  assert(/address bar of the Airbyte UI/.test(err.message), err.message);
  assertThrows(() => assertUuid("", "connectionId"), Error, "required");
});

Deno.test("jobDurationSeconds: computes what Airbyte does not report", () => {
  assertEquals(
    jobDurationSeconds({
      startTime: "2026-08-19T10:00:00Z",
      lastUpdatedAt: "2026-08-19T10:04:30Z",
    }),
    270,
  );
  assertEquals(jobDurationSeconds({ startTime: "2026-08-19T10:00:00Z" }), undefined);
  assertEquals(jobDurationSeconds({}), undefined);
});

Deno.test("compact, csv, json and query behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 2, c: "", d: false }), { a: "x", b: 2, d: false });
});

/** Three minutes, so a 401 is nearly always expiry. */
Deno.test("describeError: a 401 names the three-minute token life", () => {
  const message = describeError(401, JSON.stringify({ message: "Unauthorized" }));
  assert(/THREE MINUTES/.test(message), message);
  assert(/expired token than a wrong one/.test(message), message);
});

/** Verified live: the token endpoint answers with only an error id. */
Deno.test("describeError: carries the opaque errorId when that is all there is", () => {
  const message = describeError(401, JSON.stringify({ errorId: "125f562d-3870" }));
  assert(/125f562d-3870/.test(message), message);
});

/** Airbyte runs one job per connection and refuses the second. */
Deno.test("describeError: a 409 names the already-running sync", () => {
  const message = describeError(409, JSON.stringify({ message: "conflict" }));
  assert(/ALREADY RUNNING/.test(message), message);
  assert(/refused rather than queued/.test(message), message);
});

/** Airbyte's error envelope nests the useful message. */
Deno.test("describeError: reads the HAL-style embedded error", () => {
  const message = describeError(
    500,
    JSON.stringify({ _embedded: { errors: [{ message: "internal boom" }] } }),
  );
  assert(/internal boom/.test(message), message);
});

Deno.test("request: an error names the method, the path and the reason", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not found" } }], D);
  let message = "";
  try {
    await new AirbyteClient(ctx).request(`/connections/${UUID}`);
  } catch (err) {
    message = String(err);
  }
  assert(new RegExp(`Airbyte 404 for GET /v1/connections/${UUID}`).test(message), message);
  assert(/does not distinguish the two/.test(message), message);
});

/** /health answers plain text, so text mode has to exist. */
Deno.test("request: text mode returns the body verbatim", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "Successful operation" }], D);
  const body = await new AirbyteClient(ctx).request<string>("/health", { text: true });
  assertEquals(body, "Successful operation");
});
