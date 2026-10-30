import { test } from "node:test";
import { assertEquals, assertRejects, assertThrows } from "../_assert.ts";
import { mockActiveCampaignCtx, mockCtx } from "../_helpers.ts";
import { ActiveCampaignClient, apiUrlFromConnection, baseUrl, compact } from "../../lib/client.ts";

test("client: builds the URL from the connection's apiUrl, not a param", async () => {
  const { ctx, calls } = mockActiveCampaignCtx(
    [{ body: { contact: {} } }],
    "https://acme.api-us1.com",
  );
  await new ActiveCampaignClient(ctx).request("/contacts/1");
  assertEquals(calls[0].url, "https://acme.api-us1.com/api/3/contacts/1");
  assertEquals("api-token" in calls[0].headers, false);
});

test("client: strips a trailing slash from apiUrl", async () => {
  const { ctx, calls } = mockActiveCampaignCtx([{ body: {} }], "https://acme.api-us1.com/");
  await new ActiveCampaignClient(ctx).request("/contacts/1");
  assertEquals(calls[0].url, "https://acme.api-us1.com/api/3/contacts/1");
});

test("client: fails loudly when the connection carries no apiUrl", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new ActiveCampaignClient(ctx), Error, "no apiUrl");
});

test("client: surfaces ActiveCampaign's error body", async () => {
  const { ctx } = mockActiveCampaignCtx([{
    status: 422,
    statusText: "Unprocessable Entity",
    body: '{"errors":[{"title":"Title is required"}]}',
  }]);
  await assertRejects(
    () => new ActiveCampaignClient(ctx).request("/deals", { method: "POST", body: {} }),
    Error,
    "Title is required",
  );
});

test("client: returns undefined for a 204", async () => {
  const { ctx } = mockActiveCampaignCtx([{ status: 204 }]);
  assertEquals(
    await new ActiveCampaignClient(ctx).request("/contacts/1", { method: "DELETE" }),
    undefined,
  );
});

test("client: sends JSON body with content-type on writes", async () => {
  const { ctx, calls } = mockActiveCampaignCtx([{ body: { deal: {} } }]);
  await new ActiveCampaignClient(ctx).request("/deals", {
    method: "POST",
    body: { deal: { title: "x" } },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ deal: { title: "x" } }));
});

test("apiUrlFromConnection: reads the display data afterConnect records", () => {
  assertEquals(
    apiUrlFromConnection({ display: { apiUrl: "https://acme.api-us1.com" } } as never),
    "https://acme.api-us1.com",
  );
  assertThrows(() => apiUrlFromConnection(undefined), Error, "no apiUrl");
});

test("baseUrl: appends the fixed /api/3 segment", () => {
  assertEquals(baseUrl("https://acme.api-us1.com"), "https://acme.api-us1.com/api/3");
  assertEquals(baseUrl("https://acme.api-us1.com/"), "https://acme.api-us1.com/api/3");
});

test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: 0, b: undefined, c: null, d: "", e: "x" }), { a: 0, e: "x" });
});
