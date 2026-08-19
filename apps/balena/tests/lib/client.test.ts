import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API,
  assertUuid,
  BalenaClient,
  compact,
  csv,
  describeError,
  DEVICE_STATUS_MEANING,
  odataString,
  supervisorAccepted,
  supervisorError,
  VERSION,
} from "../../lib/client.ts";

const UUID = "a".repeat(32);

Deno.test("list: unwraps the OData `d` envelope and builds the v7 path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { d: [{ id: 1 }] } }]);
  const rows = await new BalenaClient(ctx).list("device", { query: { $top: 1 } });
  assertEquals(VERSION, "v7");
  assertEquals(new URL(calls[0].url).pathname, "/v7/device");
  assertEquals(new URL(calls[0].url).searchParams.get("$top"), "1");
  assertEquals(rows, [{ id: 1 }]);
});

Deno.test("list: an empty collection is an empty array, not undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { d: [] } }]);
  assertEquals(await new BalenaClient(ctx).list("device"), []);
  const missing = mockCtx([{ status: 200, body: {} }]);
  assertEquals(await new BalenaClient(missing.ctx).one("device"), undefined);
});

Deno.test("request: never sets an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { d: [] } }]);
  await new BalenaClient(ctx).list("application");
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** The supervisor proxy takes the device in the body, not the path. */
Deno.test("supervisor: posts uuid and data to the proxy", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: '{"Data":"OK","Error":""}' }]);
  await new BalenaClient(ctx).supervisor("/v1/purge", UUID, { appId: 42 });
  assertEquals(calls[0].url, `${API}/supervisor/v1/purge`);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { uuid: UUID, data: { appId: 42 } });
});

Deno.test("supervisor: omits an absent data object rather than sending null", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  await new BalenaClient(ctx).supervisor("/v1/blink", UUID);
  assertEquals(JSON.parse(calls[0].body!), { uuid: UUID });
});

/** balena kept a capitalised response shape from a Go rewrite. */
Deno.test("supervisorAccepted: understands every shape the supervisor uses", () => {
  assertEquals(supervisorAccepted({ Data: "OK", Error: "" }), true);
  assertEquals(supervisorAccepted("OK"), true);
  assertEquals(supervisorAccepted(""), true, "blink answers with an empty body");
  assertEquals(supervisorAccepted(undefined), true);
  assertEquals(supervisorAccepted({ Data: "", Error: "Update lock is set" }), false);
});

Deno.test("supervisorError: reads the capital-E field", () => {
  assertEquals(supervisorError({ Error: "Update lock is set" }), "Update lock is set");
  assertEquals(supervisorError({ Data: "OK", Error: "" }), undefined);
  assertEquals(supervisorError("OK"), undefined);
});

/** The dashboard shows seven characters and they match nothing. */
Deno.test("assertUuid: rejects the short uuid with the reason it looks like a missing device", () => {
  assertEquals(assertUuid(UUID), UUID);
  assertEquals(assertUuid(UUID.toUpperCase()), UUID);
  const short = assertThrows(() => assertUuid("a1b2c3d"), Error);
  assert(/SHORT uuid the dashboard displays/.test(short.message), short.message);
  const dashed = assertThrows(() => assertUuid("123e4567-e89b-12d3-a456-426614174000"), Error);
  assert(/not an RFC 4122 UUID/.test(dashed.message), dashed.message);
  assertThrows(() => assertUuid(""), Error, "required");
});

Deno.test("assertUuid: accepts the 62-character form balena also issues", () => {
  const long = "b".repeat(62);
  assertEquals(assertUuid(long), long);
});

/** OData escapes a quote by doubling it. */
Deno.test("odataString: doubles the single quote rather than escaping it", () => {
  assertEquals(odataString("berlin"), "'berlin'");
  assertEquals(odataString("o'brien"), "'o''brien'");
});

Deno.test("compact and csv behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
});

Deno.test("DEVICE_STATUS_MEANING explains the statuses that read as failures", () => {
  assert(/provisioning/.test(DEVICE_STATUS_MEANING.configuring));
  assert(/not billed/.test(DEVICE_STATUS_MEANING.inactive));
});

/** The trap: an unauthenticated fleet listing succeeds. */
Deno.test("describeError: a 401 names the endpoint that does not need a credential", () => {
  const message = describeError(401, JSON.stringify({ message: "Unauthorized" }));
  assert(/UNAUTHENTICATED `\/application`/.test(message), message);
});

/** Measured: a misspelled field is a 500, not a 400. */
Deno.test("describeError: a 500 on a filtered query blames the filter, not balena", () => {
  const filtered = describeError(500, "", "https://api.balena-cloud.com/v7/device?$filter=nope");
  assert(/MISSPELLED FIELD NAME/.test(filtered), filtered);
  const plain = describeError(500, "", "https://api.balena-cloud.com/v7/device");
  assert(!/MISSPELLED/.test(plain), plain);
});

Deno.test("describeError: a 404 says an empty match is not a 404", () => {
  assert(/EMPTY LIST/.test(describeError(404, "{}")));
});

Deno.test("request: an error names the method, the path and the reason", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "no access" } }]);
  let message = "";
  try {
    await new BalenaClient(ctx).list("device");
  } catch (err) {
    message = String(err);
  }
  assert(/balena 403 for GET \/v7\/device/.test(message), message);
  assert(/organization membership/.test(message), message);
});

/** Some supervisor routes answer with a bare OK. */
Deno.test("request: a non-JSON body comes back as text rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "OK" }]);
  assertEquals(await new BalenaClient(ctx).request("/supervisor/v1/restart", { text: true }), "OK");
});
