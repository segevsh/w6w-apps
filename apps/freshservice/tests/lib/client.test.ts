import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockFreshserviceCtx } from "../_helpers.ts";
import {
  baseUrl,
  compact,
  csv,
  customFields,
  domainFromConnection,
  FreshserviceClient,
  unset,
  unwrap,
} from "../../lib/client.ts";

Deno.test("client: builds the URL from the connection's domain, not a param", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { ticket: { id: 1 } } }], "acme");
  await new FreshserviceClient(ctx).request("/tickets/1");
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/tickets/1");
  // Actions never carry credentials — the runtime's `sign` hook adds them.
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: fails loudly when the connection carries no domain", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new FreshserviceClient(ctx), Error, "no domain");
});

Deno.test("client: drops empty query values rather than sending blanks", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { tickets: [] } }]);
  await new FreshserviceClient(ctx).request("/tickets", {
    query: { page: 2, filter: "", email: undefined, workspace_id: 0 },
  });
  assertEquals(
    calls[0].url,
    "https://acme.freshservice.com/api/v2/tickets?page=2&workspace_id=0",
  );
});

Deno.test("client: surfaces Freshservice's error body", async () => {
  const { ctx } = mockFreshserviceCtx([{
    status: 400,
    statusText: "Bad Request",
    body:
      '{"description":"Validation failed","errors":[{"field":"subject","message":"can\'t be blank","code":"missing_field"}]}',
  }]);
  await assertRejects(
    () => new FreshserviceClient(ctx).request("/tickets", { method: "POST", body: {} }),
    Error,
    "can't be blank",
  );
});

Deno.test("client: returns undefined for a 204", async () => {
  const { ctx } = mockFreshserviceCtx([{ status: 204 }]);
  assertEquals(
    await new FreshserviceClient(ctx).request("/tickets/1", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("client: resource() unwraps the resource-keyed envelope", async () => {
  const single = mockFreshserviceCtx([{ body: { ticket: { id: 7 } } }]);
  assertEquals(await new FreshserviceClient(single.ctx).resource("ticket", "/tickets/7"), {
    id: 7,
  });

  const many = mockFreshserviceCtx([{ body: { tickets: [{ id: 7 }] } }]);
  assertEquals(await new FreshserviceClient(many.ctx).resource("tickets", "/tickets"), [{ id: 7 }]);
});

Deno.test("unwrap: passes a bare payload through untouched", () => {
  // Defensive: if an endpoint ever stops enveloping, actions keep working.
  assertEquals(unwrap({ id: 1 }, "ticket"), { id: 1 });
  assertEquals(unwrap({ ticket: { id: 1 } }, "ticket"), { id: 1 });
  assertEquals(unwrap(undefined, "ticket"), undefined);
});

Deno.test("domainFromConnection: reads the display data afterConnect records", () => {
  assertEquals(domainFromConnection({ display: { domain: "acme" } } as never), "acme");
  assertThrows(() => domainFromConnection(undefined), Error, "no domain");
});

Deno.test("baseUrl: builds the per-account host", () => {
  assertEquals(baseUrl("acme"), "https://acme.freshservice.com/api/v2");
});

Deno.test("customFields: accepts the flat map, as a string or object", () => {
  assertEquals(customFields({ custom_text: "v" }), { custom_text: "v" });
  assertEquals(customFields('{"custom_text":"v"}'), { custom_text: "v" });
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
