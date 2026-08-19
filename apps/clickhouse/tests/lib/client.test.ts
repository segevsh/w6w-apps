import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_HOST,
  CloudClient,
  compact,
  csv,
  describeCloudError,
  emptyToUndefined,
  json,
  organizationFromConnection,
  query,
  requireControlPlane,
  uuid,
} from "../../lib/client.ts";

const ORG = "11111111-2222-3333-4444-555555555555";
const D = { display: { organizationId: ORG, organizationName: "Acme", plane: "control" } };

Deno.test("the control plane is one host, not regional", () => {
  assertEquals(API_HOST, "https://api.clickhouse.cloud");
});

/** Every id in ClickHouse Cloud is a UUID, and a name where one belongs 404s. */
Deno.test("uuid: refuses a name used where an id belongs", () => {
  assertEquals(uuid(ORG, "serviceId"), ORG);
  const err = assertThrows(() => uuid("my-service", "serviceId"), Error);
  assert(/must be a UUID/.test(err.message), err.message);
  assert(/`service-list` report them/.test(err.message), err.message);
  assertThrows(() => uuid("", "serviceId"), Error, "required");
});

/** A query connection cannot manage services, and the error says which it is. */
Deno.test("organizationFromConnection: a service connection is refused with the reason", () => {
  const control = mockCtx([], D);
  assertEquals(organizationFromConnection(control.ctx.connection), ORG);
  assertEquals(requireControlPlane(control.ctx), ORG);

  const queryConn = mockCtx([], { display: { host: "https://x:8443", plane: "query" } });
  const err = assertThrows(() => organizationFromConnection(queryConn.ctx.connection), Error);
  assert(/SERVICE connection/.test(err.message), err.message);
  assert(/need an organisation API key/.test(err.message), err.message);
});

/** Every control-plane path is prefixed with the organisation. */
Deno.test("request: builds the path under the connection's organisation", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { result: [] } }], D);
  await new CloudClient(ctx).request("/services");
  assertEquals(calls[0].url, `${API_HOST}/v1/organizations/${ORG}/services`);
});

/** The control plane wraps everything in {result, status, requestId}. */
Deno.test("request: unwraps the result envelope", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { result: [{ id: "a" }], status: 200, requestId: "r-1" },
  }], D);
  assertEquals(await new CloudClient(ctx).request("/services"), [{ id: "a" }]);
});

Deno.test("request: a body with no result envelope is returned as it is", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "a" } }], D);
  assertEquals(await new CloudClient(ctx).request("/x"), { id: "a" });
});

Deno.test("request: never sets an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { result: [] } }], D);
  await new CloudClient(ctx).request("/services");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("request: a 204 returns undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204 }], D);
  assertEquals(await new CloudClient(ctx).request("/services/x", { method: "DELETE" }), undefined);
});

Deno.test("compact, emptyToUndefined, csv, json and query behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(emptyToUndefined({ a: "", b: undefined }), undefined);
  assertEquals(emptyToUndefined({ a: 1 }), { a: 1 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 2, c: "" }), { a: "x", b: 2 });
});

/** The requestId is what ClickHouse support asks for. */
Deno.test("describeCloudError: keeps the requestId and the message", () => {
  const message = describeCloudError(
    404,
    JSON.stringify({ error: "service not found", requestId: "abc-123" }),
  );
  assert(/service not found/.test(message), message);
  assert(/requestId abc-123/.test(message), message);
});

/** A read-only key succeeds on every list and fails on the first change. */
Deno.test("describeCloudError: a 403 names the key's role", () => {
  const message = describeCloudError(403, JSON.stringify({ error: "forbidden" }));
  assert(/read-only key succeeds on every list/.test(message), message);
});

Deno.test("describeCloudError: 401, 404, 409 and 429 each explain themselves", () => {
  assert(/key ID and a key SECRET/.test(describeCloudError(401, "{}")));
  assert(/identified by UUID/.test(describeCloudError(404, "{}")));
  assert(/refuses the change rather than queueing/.test(describeCloudError(409, "{}")));
  assert(/separate from anything the query interface/.test(describeCloudError(429, "{}")));
});

Deno.test("request: an error names the method, the path and the explanation", async () => {
  const { ctx } = mockCtx([{ status: 409, body: { error: "service is starting" } }], D);
  let message = "";
  try {
    await new CloudClient(ctx).request("/services/x/state", { method: "PATCH", body: {} });
  } catch (err) {
    message = String(err);
  }
  assert(/409/.test(message), message);
  assert(/PATCH \/v1\/organizations/.test(message), message);
  assert(/service is starting/.test(message), message);
});
