import { assert, assertEquals, assertThrows } from "@std/assert";

import {
  API_BASE,
  applyQuery,
  asArray,
  compact,
  formatRdStationError,
  jsonInit,
  messageFromErrorBody,
  sendJson,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: the base URL is the only server the CRM v1 reference declares", () => {
  assertEquals(API_BASE, "https://crm.rdstation.com/api/v1");
});

Deno.test("applyQuery: drops unset values, keeps false and 0, never touches the path", () => {
  const url = new URL(`${API_BASE}/deal_pipelines`);

  applyQuery(url, {
    page: 2,
    limit: undefined,
    order: null,
    q: "",
    win: false,
    rating: 0,
    active: true,
  });

  assertEquals(url.pathname, "/api/v1/deal_pipelines");
  assertEquals(url.search, "?page=2&win=false&rating=0&active=true");
});

Deno.test("compact: drops empty values but keeps false and 0 (a rating of 0 is a rating)", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }),
    { a: 1, e: false, f: 0 },
  );
});

Deno.test("messageFromErrorBody: reads both documented error envelopes", () => {
  assertEquals(messageFromErrorBody({ error: "Permission denied." }), "Permission denied.");
  assertEquals(
    messageFromErrorBody({
      errors: { error_type: "RESOURCE_NOT_FOUND", error_message: "Contact not found" },
    }),
    "RESOURCE_NOT_FOUND: Contact not found",
  );
  assertEquals(
    messageFromErrorBody({ errors: { name: ["can't be blank"], emails: ["is invalid"] } }),
    "name: can't be blank; emails: is invalid",
  );
  assertEquals(messageFromErrorBody({}), undefined);
  assertEquals(messageFromErrorBody("nope"), undefined);
});

Deno.test("formatRdStationError: keeps the vendor's message and adds the fix for the code", () => {
  const unauthorized = formatRdStationError(
    401,
    "GET",
    "/api/v1/contacts",
    '{"error":"Permission denied."}',
  );
  assert(unauthorized.includes("401"), unauthorized);
  assert(unauthorized.includes("Permission denied."), unauthorized);
  assert(/Configurações → Integrações → Tokens/.test(unauthorized), unauthorized);

  const notFound = formatRdStationError(
    404,
    "GET",
    "/api/v1/contacts/x",
    '{"errors":{"error_type":"RESOURCE_NOT_FOUND","error_message":"Not found"}}',
  );
  assert(notFound.includes("RESOURCE_NOT_FOUND: Not found"), notFound);

  const throttled = formatRdStationError(429, "GET", "/api/v1/deals", "");
  assert(/120 requests\/minute/.test(throttled), throttled);
});

Deno.test("formatRdStationError: survives a non-JSON body and truncates a huge one", () => {
  assert(
    formatRdStationError(502, "GET", "/x", "<html>Bad gateway</html>").includes("Bad gateway"),
  );

  const huge = formatRdStationError(500, "GET", "/x", "y".repeat(5000));
  assert(huge.length < 1100, `not truncated: ${huge.length}`);
  assert(huge.includes("truncated"), huge);
});

Deno.test("jsonInit: JSON content type and a serialized body", () => {
  const init = jsonInit("PUT", { contact: { name: "Ada" } });

  assertEquals(init.method, "PUT");
  assertEquals(init.body, '{"contact":{"name":"Ada"}}');
  assertEquals((init.headers as Record<string, string>)["content-type"], "application/json");
});

Deno.test("sendJson: returns the parsed body and always asks for JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [] } }]);

  const out = await sendJson(ctx, new URL(`${API_BASE}/users`));

  assertEquals(out, { users: [] });
  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(calls[0].method, "GET");
});

Deno.test("sendJson: an empty body parses to undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);

  assertEquals(await sendJson(ctx, new URL(`${API_BASE}/contacts/x`)), undefined);
});

Deno.test("sendJson: a failure carries the vendor's own message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { errors: { name: ["can't be blank"] } } }]);

  const error = await sendJson(ctx, new URL(`${API_BASE}/contacts`)).catch((e: Error) => e);

  assert(error instanceof Error);
  assert(/422/.test(error.message), error.message);
  assert(/name: can't be blank/.test(error.message), error.message);
});

Deno.test("asArray: accepts an array, a JSON string and a single object", () => {
  const value = [{ email: "a@b.com" }];

  assertEquals(asArray(value), value);
  assertEquals(asArray('[{"email":"a@b.com"}]'), value);
  assertEquals(asArray('{"email":"a@b.com"}'), value);
  assertEquals(asArray({ email: "a@b.com" }), value);
  assertEquals(asArray(undefined), undefined);
  assertEquals(asArray(""), undefined);
});

Deno.test("asArray: invalid JSON is refused loudly, not silently dropped", () => {
  assertThrows(() => asArray("{not json"), Error, "not valid JSON");
});
