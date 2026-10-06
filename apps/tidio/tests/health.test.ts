import { assertEquals } from "@std/assert";
import service, { API_COMPONENT_ID, PAGE_ID } from "../health/service.ts";
import quota from "../health/quota.ts";
import { mockCtx } from "./_helpers.ts";

const page = { id: PAGE_ID, name: "Tidio", url: "https://status.tidio.com" };
const comps = (apiStatus: string, other = "operational") => [
  { id: API_COMPONENT_ID, name: "API", status: apiStatus },
  { id: "x1", name: "Chat widget", status: other },
];
// deno-lint-ignore no-explicit-any
const run = (h: any, ctx: any) => h.check({}, ctx);

Deno.test("service: only the API component drives the verdict", async () => {
  const { ctx } = mockCtx([{ body: { page, components: comps("operational", "major_outage") } }]);
  const r = await run(service, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.components.x1.state, "down");
});

Deno.test("service: API outage is down; a foreign page is unknown", async () => {
  const a = mockCtx([{ body: { page, components: comps("major_outage") } }]);
  assertEquals((await run(service, a.ctx)).state, "down");
  const b = mockCtx([{
    body: { page: { ...page, name: "Other" }, components: comps("operational") },
  }]);
  assertEquals((await run(service, b.ctx)).state, "unknown");
  const c = mockCtx([{ status: 500, body: {} }]);
  assertEquals((await run(service, c.ctx)).state, "unknown");
});

Deno.test("quota: reads the x-ratelimit headers", async () => {
  const h = (rem: string) => ({ "x-ratelimit-limit": "60", "x-ratelimit-remaining": rem });
  const ok = mockCtx([{ body: { project_id: 1 }, headers: h("50") }]);
  const r = await run(quota, ok.ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota[0].remaining, 50);
  const low = mockCtx([{ body: { project_id: 1 }, headers: h("3") }]);
  assertEquals((await run(quota, low.ctx)).state, "degraded");
  const none = mockCtx([{ body: { project_id: 1 } }]);
  assertEquals((await run(quota, none.ctx)).state, "unknown");
  const denied = mockCtx([{ status: 401, body: {} }]);
  assertEquals((await run(quota, denied.ctx)).state, "unknown");
});
