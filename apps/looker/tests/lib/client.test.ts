import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  assertQualifiedFields,
  compact,
  csv,
  describeError,
  HOSTED_SUFFIX,
  hostFromConnection,
  json,
  LookerClient,
  normalizeHost,
  query,
  SELF_HOSTED_API_PORT,
} from "../../lib/client.ts";

const D = { display: { host: "https://mycompany.cloud.looker.com" } };

/** Self-hosted Looker serves its API on 19999; hosted does not. */
Deno.test("normalizeHost: adds 19999 for a self-hosted host and not for a hosted one", () => {
  assertEquals(SELF_HOSTED_API_PORT, 19999);
  assertEquals(HOSTED_SUFFIX, ".cloud.looker.com");
  assertEquals(
    normalizeHost("https://mycompany.cloud.looker.com"),
    "https://mycompany.cloud.looker.com",
  );
  assertEquals(normalizeHost("mycompany.cloud.looker.com"), "https://mycompany.cloud.looker.com");
  assertEquals(normalizeHost("https://looker.internal"), "https://looker.internal:19999");
  assertEquals(normalizeHost("looker.internal"), "https://looker.internal:19999");
});

Deno.test("normalizeHost: an explicit port is respected either way", () => {
  assertEquals(normalizeHost("https://looker.internal:9999"), "https://looker.internal:9999");
  assertEquals(
    normalizeHost("https://mycompany.cloud.looker.com:19999"),
    "https://mycompany.cloud.looker.com:19999",
  );
  assertThrows(() => normalizeHost(""), Error, "required");
});

Deno.test("hostFromConnection: says to reconnect when no instance is recorded", () => {
  const withHost = mockCtx([], D);
  assertEquals(hostFromConnection(withHost.ctx.connection), "https://mycompany.cloud.looker.com");
  const without = mockCtx([], { display: {} });
  const err = assertThrows(() => hostFromConnection(without.ctx.connection), Error);
  assert(/every Looker deployment is its own host/.test(err.message), err.message);
});

Deno.test("request: builds the 4.0 path under the instance", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], D);
  await new LookerClient(ctx).request("/user");
  assertEquals(calls[0].url, "https://mycompany.cloud.looker.com/api/4.0/user");
});

/** The auth hook signs; the client must never carry a token. */
Deno.test("request: never sets an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], D);
  await new LookerClient(ctx).request("/looks");
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** Query results come back as CSV, text or an image as well as JSON. */
Deno.test("request: text mode returns the body verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "a,b\n1,2" }], D);
  const result = await new LookerClient(ctx).request<string>("/queries/run/csv", { text: true });
  assertEquals(result, "a,b\n1,2");
  assertEquals(calls[0].headers["accept"], "*/*");
});

/** A bare name reads as a missing field rather than a malformed reference. */
Deno.test("assertQualifiedFields: demands view_name.field_name, and says why", () => {
  assertQualifiedFields(["orders.count", "users.created_date"], "fields");
  const err = assertThrows(
    () => assertQualifiedFields(["orders.count", "count", "total"], "fields"),
    Error,
  );
  assert(/These are not: count, total/.test(err.message), err.message);
  assert(/reads as though it does not exist/.test(err.message), err.message);
});

Deno.test("compact, csv, json and query behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 2, c: "" }), { a: "x", b: 2 });
});

/** The useful detail for a rejected query is in the errors array. */
Deno.test("describeError: surfaces per-field validation errors", () => {
  const message = describeError(
    422,
    JSON.stringify({
      message: "Validation Failed",
      errors: [{ field: "query.fields", message: "Unknown field" }],
    }),
  );
  assert(/Validation Failed/.test(message), message);
  assert(/query\.fields: Unknown field/.test(message), message);
  assert(/`view_name\.field_name`/.test(message), message);
});

/** A Looker token lasts an hour. */
Deno.test("describeError: a 401 names token expiry rather than a wrong key", () => {
  const message = describeError(401, JSON.stringify({ message: "Not authenticated" }));
  assert(/lasts one hour/.test(message), message);
});

/** The API's `view` is the interface's Explore. */
Deno.test("describeError: a 404 names the view-versus-Explore trap", () => {
  const message = describeError(404, JSON.stringify({ message: "Not found" }));
  assert(/`view` is the EXPLORE name/.test(message), message);
});

Deno.test("describeError: 403 and 429 explain themselves", () => {
  assert(/per role and per model set/.test(describeError(403, "{}")));
  assert(/separate from any limit the underlying warehouse/.test(describeError(429, "{}")));
});

Deno.test("request: an error names the method, the path and the explanation", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not found" } }], D);
  let message = "";
  try {
    await new LookerClient(ctx).request("/looks/999");
  } catch (err) {
    message = String(err);
  }
  assert(/404/.test(message), message);
  assert(/GET \/api\/4\.0\/looks\/999/.test(message), message);
});
