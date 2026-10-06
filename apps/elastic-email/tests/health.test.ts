import { assertEquals } from "@std/assert";
import service, { findApiComponent, mapComponentStatus } from "../health/service.ts";
import api from "../health/api.ts";
import quota from "../health/quota.ts";
import { errorBody, mockCtx } from "./_helpers.ts";

const page = { id: "qqs7zd1q0z5q", name: "Elastic Email Status Page" };
const comps = (apiStatus: string) => [
  { id: "nfj1bq4byr9f", name: "API.ELASTICEMAIL.COM", status: apiStatus },
  { id: "l6wfpwbg6yxv", name: "ELASTICEMAIL.COM", status: "operational" },
];
const run = (responses: Parameters<typeof mockCtx>[0]) =>
  service.check!({} as never, mockCtx(responses).ctx);

Deno.test("service: operational API component is ok", async () => {
  const r = await run([{ body: { page, components: comps("operational"), incidents: [] } }]);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components ?? {}).length, 2);
});

Deno.test("service: API outage is down; other-component trouble never drives the verdict", async () => {
  assertEquals((await run([{ body: { page, components: comps("major_outage") } }])).state, "down");
  const other = [
    { id: "nfj1bq4byr9f", name: "API.ELASTICEMAIL.COM", status: "operational" },
    { id: "t8bzfkfkrf08", name: "SMTP.ELASTICEMAIL.COM", status: "major_outage" },
  ];
  const r = await run([{ body: { page, components: other } }]);
  assertEquals(r.state, "ok");
  assertEquals(r.message?.includes("affected"), true);
});

Deno.test("service: wrong page, missing component or HTTP failure is unknown, never down", async () => {
  assertEquals(
    (await run([{ body: { page: { id: "zzz" }, components: comps("operational") } }])).state,
    "unknown",
  );
  assertEquals(
    (await run([{
      body: { page, components: [{ id: "x", name: "Other", status: "operational" }] },
    }])).state,
    "unknown",
  );
  assertEquals((await run([{ status: 503, body: "x" }])).state, "unknown");
  assertEquals((await run([{ body: "<html>" }])).state, "unknown");
  assertEquals((await run([{ body: { page, components: [] } }])).state, "unknown");
});

Deno.test("service: status mapping, name fallback and open incidents", async () => {
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("nonsense"), "unknown");
  assertEquals(findApiComponent([{ id: "new", name: "api.elasticemail.com" }])?.id, "new");
  const r = await run([{
    body: { page, components: comps("degraded_performance"), incidents: [{}] },
  }]);
  assertEquals(r.state, "degraded");
  assertEquals(r.message?.includes("1 open incident"), true);
});

Deno.test("api: a schema-correct auth error (HTTP 400 {Error}) is a pass", async () => {
  const { ctx, calls } = mockCtx([{ status: 400, body: errorBody("APIKey Expired") }]);
  const r = await api.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].headers["x-elasticemail-apikey"], undefined);
});

Deno.test("api: 5xx and non-JSON are down; an unrelated JSON body is unknown", async () => {
  assertEquals(
    (await api.check!({} as never, mockCtx([{ status: 503, body: { x: 1 } }]).ctx)).state,
    "down",
  );
  assertEquals(
    (await api.check!({} as never, mockCtx([{ status: 200, body: "<html>" }]).ctx)).state,
    "down",
  );
  assertEquals(
    (await api.check!({} as never, mockCtx([{ status: 200, body: { hello: "world" } }]).ctx))
      .state,
    "unknown",
  );
});

Deno.test("quota: a declared absence with informational severity", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
});
