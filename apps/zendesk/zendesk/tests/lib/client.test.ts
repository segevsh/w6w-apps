import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockZendeskCtx } from "../_helpers.ts";
import {
  baseUrl,
  compact,
  csv,
  customFields,
  subdomainFromConnection,
  unset,
  ZendeskClient,
} from "../../lib/client.ts";

Deno.test("client: builds the URL from the connection's subdomain, not a param", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { ticket: {} } }], "acme");
  await new ZendeskClient(ctx).request("/tickets/1.json");
  assertEquals(calls[0].url, "https://acme.zendesk.com/api/v2/tickets/1.json");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: fails loudly when the connection carries no subdomain", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new ZendeskClient(ctx), Error, "no subdomain");
});

Deno.test("client: surfaces Zendesk's error body", async () => {
  const { ctx } = mockZendeskCtx([{
    status: 422,
    statusText: "Unprocessable Entity",
    body:
      '{"error":"RecordInvalid","details":{"base":[{"description":"Subject: cannot be blank"}]}}',
  }]);
  await assertRejects(
    () => new ZendeskClient(ctx).request("/tickets.json", { method: "POST", body: {} }),
    Error,
    "Subject: cannot be blank",
  );
});

Deno.test("client: returns undefined for a 204", async () => {
  const { ctx } = mockZendeskCtx([{ status: 204 }]);
  assertEquals(
    await new ZendeskClient(ctx).request("/tickets/1.json", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("subdomainFromConnection: reads the display data afterConnect records", () => {
  assertEquals(
    subdomainFromConnection({ display: { subdomain: "acme" } } as never),
    "acme",
  );
  assertThrows(() => subdomainFromConnection(undefined), Error, "no subdomain");
});

Deno.test("baseUrl: builds the per-account host", () => {
  assertEquals(baseUrl("acme"), "https://acme.zendesk.com/api/v2");
});

Deno.test("customFields: accepts both the id map and the array form", () => {
  assertEquals(customFields({ "360001": "x" }), [{ id: 360001, value: "x" }]);
  assertEquals(customFields('[{"id":1,"value":"y"}]'), [{ id: 1, value: "y" }]);
  assertEquals(customFields(""), undefined);
  assertEquals(customFields({}), undefined);
});

Deno.test("customFields: rejects a scalar rather than sending nonsense", () => {
  assertThrows(() => customFields('"nope"'), Error, "must be a JSON object");
});

Deno.test("compact/csv/unset behave as the other apps' helpers do", () => {
  assertEquals(compact({ a: 0, b: undefined, c: null }), { a: 0 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(unset(""), undefined);
});
