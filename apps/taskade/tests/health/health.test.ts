import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import quota, { headroom } from "../../health/quota.ts";
import service, { APP_COMPONENT_ID, PAGE_ID } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const input = { connection: undefined } as never;
const unauthorized = { ok: false, message: "Unauthorized", code: "UNAUTHORIZED" };

Deno.test("api: a schema-correct UNAUTHORIZED envelope is a pass, 5xx is down", async () => {
  const ok = await api.check!(input, mockCtx([{ status: 401, body: unauthorized }]).ctx);
  assertEquals(ok.state, "ok");
  const { ctx, calls } = mockCtx([{ status: 502, body: "bad gateway" }]);
  assertEquals((await api.check!(input, ctx)).state, "down");
  assertEquals(calls[0].url, "https://www.taskade.com/api/v1/workspaces");
});

Deno.test("api: a 200 HTML shell is degraded, an unreachable host is down", async () => {
  assertEquals(
    (await api.check!(input, mockCtx([{ status: 200, body: "<html>" }]).ctx)).state,
    "degraded",
  );
  const ctx = { fetch: () => Promise.reject(new Error("boom")), log: () => {} } as never;
  assertEquals((await api.check!(input, ctx)).state, "down");
});

Deno.test("quota: reads the hyphenated x-rate-limit-* headers", async () => {
  const headers = { "x-rate-limit-limit": "40", "x-rate-limit-remaining": "3" };
  const out = await quota.check!(input, mockCtx([{ body: { ok: true, items: [] }, headers }]).ctx);
  assertEquals(out.state, "degraded");
  assertEquals(out.quota, [{ id: "requests", limit: 40, remaining: 3, unit: "requests" }]);
  const none = await quota.check!(input, mockCtx([{ body: { ok: true } }]).ctx);
  assertEquals(none.state, "unknown");
  assertEquals(headroom(0, 40), "down");
  assertEquals(headroom(30, 40), "ok");
});

const summary = (appStatus: string) => ({
  page: { id: PAGE_ID, name: "Taskade" },
  components: [
    { id: APP_COMPONENT_ID, name: "App", status: appStatus },
    { id: "s1", name: "Stripe API", status: "major_outage" },
  ],
  incidents: [],
});

Deno.test("service: keys off the App component, not other components", async () => {
  const ok = await service.check!(input, mockCtx([{ body: summary("operational") }]).ctx);
  assertEquals(ok.state, "ok");
  assertEquals(ok.components!["s1"].state, "down");
  const down = await service.check!(input, mockCtx([{ body: summary("major_outage") }]).ctx);
  assertEquals(down.state, "down");
});

Deno.test("service: a foreign page, a missing App or an HTTP error is unknown", async () => {
  const foreign = { ...summary("operational"), page: { id: "other" } };
  assertEquals((await service.check!(input, mockCtx([{ body: foreign }]).ctx)).state, "unknown");
  const noApp = {
    page: { id: PAGE_ID },
    components: [{ id: "s1", name: "X", status: "operational" }],
  };
  assertEquals((await service.check!(input, mockCtx([{ body: noApp }]).ctx)).state, "unknown");
  assertEquals((await service.check!(input, mockCtx([{ status: 500 }]).ctx)).state, "unknown");
});
