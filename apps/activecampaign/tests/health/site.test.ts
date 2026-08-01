import { assertEquals } from "@std/assert";
import { mockActiveCampaignCtx, mockCtx } from "../_helpers.ts";
import site from "../../health/site.ts";

Deno.test("site: dependency / connection / context posture", () => {
  assertEquals(site.kind, "dependency");
  assertEquals(site.scope, "connection");
  assertEquals(site.credential, "context");
  assertEquals(site.network, undefined);
});

Deno.test("site: unknown when the connection records no apiUrl", async () => {
  const { ctx, calls } = mockCtx();
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assertEquals(calls.length, 0);
});

Deno.test("site: ok on a plain 200", async () => {
  const { ctx, calls } = mockActiveCampaignCtx([{ status: 200, body: { contacts: [] } }]);
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(calls[0].url, "https://acme.api-us1.com/api/3/contacts?limit=1");
});

Deno.test("site: 401 counts as reachable (host is up, credential is the auth:* check's job)", async () => {
  const { ctx } = mockActiveCampaignCtx([{ status: 401, body: "" }]);
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "ok");
});

Deno.test("site: 403 also counts as reachable", async () => {
  const { ctx } = mockActiveCampaignCtx([{ status: 403, body: "" }]);
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "ok");
});

Deno.test("site: down on 404 (host wrong / not ActiveCampaign)", async () => {
  const { ctx } = mockActiveCampaignCtx([{ status: 404, body: "" }]);
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("site: down on 5xx", async () => {
  const { ctx } = mockActiveCampaignCtx([{ status: 503, body: "" }]);
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "down");
});
