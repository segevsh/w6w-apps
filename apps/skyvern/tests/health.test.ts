import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import service, { mapComponentStatus } from "../health/service.ts";
import api from "../health/api.ts";
import quota from "../health/quota.ts";
import { mockCtx } from "./_helpers.ts";

type Check = (input: unknown, ctx: HookContext) => Promise<
  { state: string; message?: string; components?: Record<string, { state: string }> }
>;
const svc = service.check as unknown as Check;
const probe = api.check as unknown as Check;

function summary(over: Record<string, string> = {}, pageId = "vz1pz14l5w34") {
  const st = (id: string, d = "operational") => over[id] ?? d;
  return {
    page: { id: pageId, name: "Skyvern" },
    status: { indicator: "none" },
    components: [
      { id: "xnr81ldhd29n", name: "Skyvern API", status: st("xnr81ldhd29n"), group: false },
      {
        id: "pgvd35gh7syv",
        name: "Skyvern Cloud (Web Application)",
        status: st("pgvd35gh7syv"),
        group: false,
      },
      {
        id: "dhzw86hnw984",
        name: "Skyvern Async Workers",
        status: st("dhzw86hnw984"),
        group: false,
      },
    ],
  };
}

Deno.test("service: declared unsigned, app-scoped, with the status host only on the hook", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.skyvern.com"]);
});

Deno.test("service: all operational is ok and reports every component", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const r = await svc({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components ?? {}).length, 3);
  assertEquals(calls[0].url, "https://status.skyvern.com/api/v2/summary.json");
});

Deno.test("service: API major outage is down; workers partial outage is degraded", async () => {
  assertEquals(
    (await svc({}, mockCtx([{ body: summary({ xnr81ldhd29n: "major_outage" }) }]).ctx)).state,
    "down",
  );
  assertEquals(
    (await svc({}, mockCtx([{ body: summary({ dhzw86hnw984: "partial_outage" }) }]).ctx)).state,
    "degraded",
  );
});

Deno.test("service: the web-app component is detail only and never moves the verdict", async () => {
  const r = await svc({}, mockCtx([{ body: summary({ pgvd35gh7syv: "major_outage" }) }]).ctx);
  assertEquals(r.state, "ok");
  assert(r.message?.includes("also affected"));
});

Deno.test("service: a different page id, a failing feed or a missing API component is unknown", async () => {
  assertEquals((await svc({}, mockCtx([{ body: summary({}, "other") }]).ctx)).state, "unknown");
  assertEquals((await svc({}, mockCtx([{ status: 503, body: "x" }]).ctx)).state, "unknown");
  const noApi = summary();
  noApi.components = noApi.components.slice(1);
  assertEquals((await svc({}, mockCtx([{ body: noApi }]).ctx)).state, "unknown");
  assertEquals((await svc({}, mockCtx([{ body: "<html>" }]).ctx)).state, "unknown");
});

Deno.test("mapComponentStatus: covers every Statuspage value", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("weird"), "unknown");
});

Deno.test("api: a 200 version document and a 403 detail body both pass", async () => {
  const ok = await probe({}, mockCtx([{ body: { version: "abc123" } }]).ctx);
  assertEquals(ok.state, "ok");
  const authErr = await probe(
    {},
    mockCtx([{ status: 403, body: { detail: "Invalid credentials" } }]).ctx,
  );
  assertEquals(authErr.state, "ok");
});

Deno.test("api: 5xx is down, an HTML shell is down, an unrelated JSON body is unknown", async () => {
  assertEquals(
    (await probe({}, mockCtx([{ status: 502, body: { detail: "x" } }]).ctx)).state,
    "down",
  );
  assertEquals((await probe({}, mockCtx([{ body: "<html>shell</html>" }]).ctx)).state, "down");
  assertEquals((await probe({}, mockCtx([{ body: { hello: 1 } }]).ctx)).state, "unknown");
});

Deno.test("api: sends no credential and calls only /v1/version", async () => {
  const { ctx, calls } = mockCtx([{ body: { version: "x" } }]);
  await probe({}, ctx);
  assertEquals(calls[0].url, "https://api.skyvern.com/v1/version");
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("quota: declared unavailable, informational, with no check hook", () => {
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason);
  assertEquals((quota as { check?: unknown }).check, undefined);
});
