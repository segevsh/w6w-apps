import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  buildCommonBody,
  buildExecuteKwBody,
  compact,
  jsonRpcUrl,
  mergeValues,
  OdooClient,
  resolveInstanceUrl,
  searchKwargs,
  splitFields,
  toDomain,
  toIds,
  UNSIGNED_ARG_COUNT,
  unwrapRpc,
} from "../../lib/client.ts";
import { executeKwArgs, mockCtx, TEST_DATABASE, TEST_INSTANCE } from "../_helpers.ts";

// --- instance URL handling --------------------------------------------------

Deno.test("resolveInstanceUrl: accepts the forms users actually paste", () => {
  // Bare host, full URL, and a URL copied straight out of the browser bar.
  assertEquals(resolveInstanceUrl("acme.odoo.com"), TEST_INSTANCE);
  assertEquals(resolveInstanceUrl("https://acme.odoo.com"), TEST_INSTANCE);
  assertEquals(resolveInstanceUrl("https://acme.odoo.com/"), TEST_INSTANCE);
  assertEquals(resolveInstanceUrl("https://acme.odoo.com/web#action=123"), TEST_INSTANCE);
  assertEquals(resolveInstanceUrl("  acme.odoo.com  "), TEST_INSTANCE);
});

Deno.test("resolveInstanceUrl: keeps an explicit http scheme and a custom port", () => {
  // Self-hosted Odoo on a LAN is a real deployment; we do not rewrite it.
  assertEquals(resolveInstanceUrl("http://odoo.internal:8069"), "http://odoo.internal:8069");
});

Deno.test("resolveInstanceUrl: defaults to https rather than plaintext", () => {
  // The credential rides in the request body, so a silent downgrade to http
  // would put it on the wire in clear.
  assert(resolveInstanceUrl("odoo.internal:8069").startsWith("https://"));
});

Deno.test("resolveInstanceUrl: rejects an empty or unusable value", () => {
  assertThrows(() => resolveInstanceUrl(undefined), Error, "missing an instance URL");
  assertThrows(() => resolveInstanceUrl("   "), Error, "missing an instance URL");
  assertThrows(() => resolveInstanceUrl("http://"), Error);
});

Deno.test("jsonRpcUrl: appends /jsonrpc to the origin", () => {
  assertEquals(jsonRpcUrl("acme.odoo.com"), "https://acme.odoo.com/jsonrpc");
  assertEquals(jsonRpcUrl("https://acme.odoo.com/web"), "https://acme.odoo.com/jsonrpc");
});

// --- envelope construction --------------------------------------------------

Deno.test("buildExecuteKwBody: emits the UNSIGNED four-element envelope", () => {
  const body = JSON.parse(buildExecuteKwBody("res.partner", "read", [[1]], { fields: ["name"] }));
  assertEquals(body.jsonrpc, "2.0");
  assertEquals(body.method, "call");
  assertEquals(body.params.service, "object");
  assertEquals(body.params.method, "execute_kw");
  assertEquals(body.params.args, ["res.partner", "read", [[1]], { fields: ["name"] }]);
  assertEquals(body.params.args.length, UNSIGNED_ARG_COUNT);
});

Deno.test("buildExecuteKwBody: carries NO credential slots, not even placeholders", () => {
  // Placeholders would be a shape the action has no business knowing, and a
  // placeholder that failed to be overwritten would be sent as a literal null.
  const body = JSON.parse(buildExecuteKwBody("res.partner", "search_read"));
  assertEquals(body.params.args[0], "res.partner");
  assert(!body.params.args.includes(null));
});

Deno.test("buildCommonBody: targets the unauthenticated common service", () => {
  const body = JSON.parse(buildCommonBody("version", []));
  assertEquals(body.params.service, "common");
  assertEquals(body.params.method, "version");
  assertEquals(body.params.args, []);
});

// --- the HTTP-200-on-error trap ---------------------------------------------

Deno.test("unwrapRpc: returns the result of a successful call", () => {
  assertEquals(unwrapRpc<number>(200, JSON.stringify({ result: 42 })), 42);
});

Deno.test("unwrapRpc: THROWS on an error body even though the status is 200", () => {
  // Verified live: Odoo answers HTTP 200 for AccessDenied and AttributeError
  // alike. Trusting res.ok would turn a rejected credential into a silent
  // `undefined` handed to the workflow.
  const body = JSON.stringify({
    error: {
      code: 0,
      message: "Odoo Server Error",
      data: { name: "odoo.exceptions.AccessDenied", message: "Access Denied" },
    },
  });
  const err = assertThrows(() => unwrapRpc(200, body), Error);
  assert(/odoo\.exceptions\.AccessDenied/.test((err as Error).message));
  assert(/Access Denied/.test((err as Error).message));
});

Deno.test("unwrapRpc: leads with the Python exception name, and omits the traceback", () => {
  const body = JSON.stringify({
    error: {
      data: {
        name: "odoo.exceptions.MissingError",
        message: "Record does not exist or has been deleted.",
        debug: "Traceback (most recent call last): SECRET-INTERNALS",
      },
    },
  });
  const err = assertThrows(() => unwrapRpc(200, body), Error) as Error;
  assert(err.message.startsWith("Odoo odoo.exceptions.MissingError:"));
  // `debug` is a server-internal traceback and belongs in Odoo's own logs.
  assert(!err.message.includes("SECRET-INTERNALS"));
});

Deno.test("unwrapRpc: explains a non-JSON body instead of a JSON parse error", () => {
  // The usual cause is a proxy, a login page, or an HTML 404 shell — i.e. the
  // instance URL does not point at an Odoo /jsonrpc endpoint.
  const err = assertThrows(
    () => unwrapRpc(404, "<!DOCTYPE html><title>404</title>"),
    Error,
  ) as Error;
  assert(/non-JSON response \(HTTP 404\)/.test(err.message));
  assert(/instance URL/.test(err.message));
});

Deno.test("unwrapRpc: reports a non-2xx status carrying no error object", () => {
  assertThrows(() => unwrapRpc(502, JSON.stringify({})), Error, "HTTP 502");
});

// --- input coercion ---------------------------------------------------------

Deno.test("splitFields: distinguishes 'unspecified' from 'every field'", () => {
  // Odoo reads `fields: []` as "return everything", so an empty form box must
  // omit the key rather than send an empty array.
  assertEquals(splitFields(undefined), undefined);
  assertEquals(splitFields(""), undefined);
  assertEquals(splitFields("  ,  "), undefined);
  assertEquals(splitFields("name, email ,phone"), ["name", "email", "phone"]);
});

Deno.test("toDomain: accepts an array, a JSON string, or nothing", () => {
  assertEquals(toDomain(undefined), []);
  assertEquals(toDomain(""), []);
  assertEquals(toDomain([["a", "=", 1]]), [["a", "=", 1]]);
  assertEquals(toDomain('[["a","=",1]]'), [["a", "=", 1]]);
});

Deno.test("toDomain: rejects malformed input with a named error", () => {
  assertThrows(() => toDomain("{not json"), Error, "not valid JSON");
  assertThrows(() => toDomain('{"a":1}'), Error, "must be a JSON array");
  assertThrows(() => toDomain(42), Error, "must be a JSON array");
});

Deno.test("toIds: accepts a number, an array or a comma-separated string", () => {
  assertEquals(toIds(42), [42]);
  assertEquals(toIds("42"), [42]);
  assertEquals(toIds("1, 2 ,3"), [1, 2, 3]);
  assertEquals(toIds([1, "2"]), [1, 2]);
  assertEquals(toIds(undefined), []);
  assertEquals(toIds(""), []);
});

Deno.test("toIds: rejects a non-integer rather than sending NaN to Odoo", () => {
  assertThrows(() => toIds("abc"), Error, "not an integer");
  assertThrows(() => toIds("1.5"), Error, "not an integer");
});

Deno.test("searchKwargs: omits everything the caller left blank", () => {
  // Sending explicit nulls would tell Odoo "no limit, no ordering, no fields"
  // rather than letting it apply its own defaults.
  assertEquals(searchKwargs({}), { domain: [] });
  assertEquals(
    searchKwargs({
      domain: [["a", "=", 1]],
      fields: "name",
      limit: 5,
      offset: 10,
      order: "id desc",
    }),
    { domain: [["a", "=", 1]], fields: ["name"], limit: 5, offset: 10, order: "id desc" },
  );
});

Deno.test("searchKwargs: passes context through for translation and timezone", () => {
  assertEquals(searchKwargs({ context: { lang: "fr_FR" } }).context, { lang: "fr_FR" });
});

Deno.test("compact: drops undefined so a write never blanks an unmentioned field", () => {
  assertEquals(compact({ a: 1, b: undefined, c: false, d: null }), { a: 1, c: false, d: null });
});

Deno.test("mergeValues: lets the escape hatch override the typed fields", () => {
  assertEquals(mergeValues({ name: "A", email: undefined }, { name: "B", phone: "1" }), {
    name: "B",
    phone: "1",
  });
  assertEquals(mergeValues({ name: "A" }, undefined), { name: "A" });
  assertEquals(mergeValues({ name: "A" }, '{"x":1}'), { name: "A", x: 1 });
});

Deno.test("mergeValues: rejects a non-object escape hatch", () => {
  assertThrows(() => mergeValues({}, "[1,2]"), Error, "must be a JSON object");
  assertThrows(() => mergeValues({}, "{oops"), Error, "not valid JSON");
});

// --- the client -------------------------------------------------------------

Deno.test("OdooClient: POSTs the unsigned envelope to the instance's /jsonrpc", async () => {
  const { ctx, calls } = mockCtx([{ result: [] }]);
  await OdooClient.fromConnection(ctx).call("res.partner", "search_read", [], { limit: 1 });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${TEST_INSTANCE}/jsonrpc`);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(executeKwArgs(calls[0]), {
    model: "res.partner",
    method: "search_read",
    args: [],
    kwargs: { limit: 1 },
  });
});

Deno.test("OdooClient: sends X-Odoo-Database, without which Odoo Online 404s", async () => {
  const { ctx, calls } = mockCtx([{ result: [] }]);
  await OdooClient.fromConnection(ctx).call("res.partner", "search_read");
  assertEquals(calls[0].headers["x-odoo-database"], TEST_DATABASE);
});

Deno.test("OdooClient: never sets an Authorization header — signing is the auth hook's job", async () => {
  const { ctx, calls } = mockCtx([{ result: [] }]);
  await OdooClient.fromConnection(ctx).call("res.partner", "search_read");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("OdooClient: surfaces an Odoo error object as a thrown error", async () => {
  const { ctx } = mockCtx([
    { error: { data: { name: "odoo.exceptions.AccessError", message: "not allowed" } } },
  ]);
  const client = OdooClient.fromConnection(ctx);
  const err = await client.call("res.partner", "search_read").catch((e) => e);
  assert(err instanceof Error);
  assert(/AccessError/.test(err.message));
});

Deno.test("OdooClient.fromConnection: fails clearly when the connection has no instance URL", () => {
  const { ctx } = mockCtx([], { display: {} });
  assertThrows(() => OdooClient.fromConnection(ctx), Error, "missing an instance URL");
});
