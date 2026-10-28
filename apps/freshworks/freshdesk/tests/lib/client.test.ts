import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockFreshdeskCtx } from "../_helpers.ts";
import {
  baseUrl,
  compact,
  csv,
  customFields,
  domainFromConnection,
  FreshdeskClient,
  unset,
} from "../../lib/client.ts";

Deno.test("client: builds the URL from the connection's domain, not a param", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: { id: 1 } }], "acme");
  await new FreshdeskClient(ctx).request("/tickets/1");
  assertEquals(calls[0].url, "https://acme.freshdesk.com/api/v2/tickets/1");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: fails loudly when the connection carries no domain", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new FreshdeskClient(ctx), Error, "no domain");
});

Deno.test("client: surfaces Freshdesk's error body", async () => {
  const { ctx } = mockFreshdeskCtx([{
    status: 400,
    statusText: "Bad Request",
    body:
      '{"description":"Validation failed","errors":[{"field":"subject","message":"can\'t be blank"}]}',
  }]);
  await assertRejects(
    () => new FreshdeskClient(ctx).request("/tickets", { method: "POST", body: {} }),
    Error,
    "can't be blank",
  );
});

Deno.test("client: returns undefined for a 204", async () => {
  const { ctx } = mockFreshdeskCtx([{ status: 204 }]);
  assertEquals(
    await new FreshdeskClient(ctx).request("/tickets/1", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("domainFromConnection: reads the display data afterConnect records", () => {
  assertEquals(
    domainFromConnection({ display: { domain: "acme" } } as never),
    "acme",
  );
  assertThrows(() => domainFromConnection(undefined), Error, "no domain");
});

Deno.test("baseUrl: builds the per-account host", () => {
  assertEquals(baseUrl("acme"), "https://acme.freshdesk.com/api/v2");
});

Deno.test("customFields: accepts the flat map, as a string or object", () => {
  assertEquals(customFields({ product: "CRM" }), { product: "CRM" });
  assertEquals(customFields('{"product":"CRM"}'), { product: "CRM" });
  assertEquals(customFields(""), undefined);
  assertEquals(customFields({}), undefined);
});

Deno.test("customFields: rejects a non-object rather than sending nonsense", () => {
  assertThrows(() => customFields('"nope"'), Error, "must be a JSON object");
  assertThrows(() => customFields("[1,2]"), Error, "must be a JSON object");
});

Deno.test("compact/csv/unset behave as the other apps' helpers do", () => {
  assertEquals(compact({ a: 0, b: undefined, c: null }), { a: 0 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(unset(""), undefined);
});
