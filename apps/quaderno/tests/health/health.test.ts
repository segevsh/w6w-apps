import { assertEquals } from "@std/assert";
import service, { API_COMPONENT_ID, mapComponentStatus, STATUS_URL } from "../../health/service.ts";
import quota from "../../health/quota.ts";
import account from "../../health/account.ts";
import { mockQuadernoCtx } from "../_helpers.ts";

const summary = (apiStatus: string, name = "Quaderno") => ({
  page: { name },
  components: [
    { id: "khz69hmfm2sg", name: "Quaderno Web Application", status: "major_outage" },
    { id: API_COMPONENT_ID, name: "Quaderno APIs", status: apiStatus },
  ],
});

Deno.test("service: reads the API component, not the web app", async () => {
  const { ctx, calls } = mockQuadernoCtx([{ body: summary("operational") }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok"); // the web app is in major_outage and is ignored
  assertEquals(service.network, { allow: ["quaderno.statuspage.io"] });
  assertEquals(service.credential, "none");
});

Deno.test("service: maps degraded and down, and refuses a foreign page", async () => {
  assertEquals(
    (await service.check!({}, mockQuadernoCtx([{ body: summary("partial_outage") }]).ctx)).state,
    "degraded",
  );
  assertEquals(
    (await service.check!({}, mockQuadernoCtx([{ body: summary("major_outage") }]).ctx)).state,
    "down",
  );
  assertEquals(
    (await service.check!({}, mockQuadernoCtx([{ body: summary("operational", "Other") }]).ctx))
      .state,
    "unknown",
  );
  assertEquals(mapComponentStatus("bogus"), "unknown");
});

Deno.test("service: a broken status API is unknown, never down", async () => {
  const r = await service.check!({}, mockQuadernoCtx([{ status: 503, body: "" }]).ctx);
  assertEquals(r.state, "unknown");
});

Deno.test("quota: reads X-RateLimit-* from /ping", async () => {
  const { ctx, calls } = mockQuadernoCtx([{
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "100",
      "x-ratelimit-remaining": "40",
      "x-ratelimit-reset": "1790000000",
    },
    body: { status: "ok" },
  }]);
  const r = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/ping");
  assertEquals(r.state, "ok");
  assertEquals(r.quota?.[0].remaining, 40);
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: exhausted window is down, missing headers are unknown", async () => {
  const low = mockQuadernoCtx([{
    headers: { "x-ratelimit-limit": "100", "x-ratelimit-remaining": "0" },
    body: { status: "ok" },
  }]);
  assertEquals((await quota.check!({}, low.ctx)).state, "down");
  const none = mockQuadernoCtx([{ body: { status: "ok" } }]);
  assertEquals((await quota.check!({}, none.ctx)).state, "unknown");
});

Deno.test("account: a schema-correct 401 proves reachability and passes", async () => {
  const { ctx, calls } = mockQuadernoCtx([{
    status: 401,
    body: { error: "Wrong API key or the user does not exist." },
  }]);
  const r = await account.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/contacts");
  assertEquals(account.credential, "context");
});

Deno.test("account: 5xx is down; an HTML 200 shell is not a pass", async () => {
  assertEquals(
    (await account.check!({}, mockQuadernoCtx([{ status: 502, body: "" }]).ctx)).state,
    "down",
  );
  assertEquals(
    (await account.check!({}, mockQuadernoCtx([{ body: "<html></html>" }]).ctx)).state,
    "degraded",
  );
});
