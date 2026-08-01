import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockOktaCtx } from "../_helpers.ts";
import { baseUrl, compact, domainFromConnection, OktaClient, unset } from "../../lib/client.ts";

Deno.test("client: builds the URL from the connection's domain, not a param", async () => {
  const { ctx, calls } = mockOktaCtx([{ body: { id: "00u1" } }], "dev-1.okta.com");
  await new OktaClient(ctx).request("/users/00u1");
  assertEquals(calls[0].url, "https://dev-1.okta.com/api/v1/users/00u1");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: fails loudly when the connection carries no domain", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new OktaClient(ctx), Error, "no domain");
});

Deno.test("client: surfaces Okta's error body", async () => {
  const { ctx } = mockOktaCtx([{
    status: 400,
    statusText: "Bad Request",
    body: '{"errorSummary":"Api validation failed: login","errorCauses":[]}',
  }]);
  await assertRejects(
    () => new OktaClient(ctx).request("/users", { method: "POST", body: {} }),
    Error,
    "Api validation failed: login",
  );
});

Deno.test("client: returns undefined for a 204", async () => {
  const { ctx } = mockOktaCtx([{ status: 204 }]);
  assertEquals(
    await new OktaClient(ctx).request("/groups/g1/users/u1", { method: "PUT" }),
    undefined,
  );
});

Deno.test("domainFromConnection: reads the display data afterConnect records", () => {
  assertEquals(
    domainFromConnection({ display: { domain: "dev-1.okta.com" } } as never),
    "dev-1.okta.com",
  );
  assertThrows(() => domainFromConnection(undefined), Error, "no domain");
});

Deno.test("baseUrl: builds the per-org host", () => {
  assertEquals(baseUrl("dev-1.okta.com"), "https://dev-1.okta.com/api/v1");
});

Deno.test("compact/unset behave as the other apps' helpers do", () => {
  assertEquals(compact({ a: 0, b: undefined, c: null }), { a: 0 });
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});
