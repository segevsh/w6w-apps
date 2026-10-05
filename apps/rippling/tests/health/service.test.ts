import { assertEquals, assertStringIncludes } from "@std/assert";
import service, { API_COMPONENT, PAGE_ID, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

type Comp = { id: string; name: string; status: string; group?: boolean };

function summary(over: Partial<Record<string, string>> = {}, extra: Comp[] = []) {
  const s = (id: string, fallback = "operational") => over[id] ?? fallback;
  return {
    page: { id: PAGE_ID, name: "Rippling", url: "https://status.rippling.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "lq3c3hps2qqf", name: "Rippling App", status: s("lq3c3hps2qqf") },
      { id: "73fdn9j7bj7y", name: "Authentication", status: s("73fdn9j7bj7y") },
      { id: API_COMPONENT.id, name: "Platform API", status: s(API_COMPONENT.id) },
      { id: "2467w9pctv6m", name: "Payroll", status: s("2467w9pctv6m") },
      ...extra,
    ],
    incidents: [],
  };
}

const run = async (body: unknown, status = 200) => {
  const { ctx, calls } = mockCtx([{ status, body }]);
  const r = await service.check!({}, ctx);
  return { r, calls };
};

Deno.test("service: declared as an unsigned app-scope check against status.rippling.com only", () => {
  assertEquals(STATUS_URL, "https://status.rippling.com/api/v2/summary.json");
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(service.network, { allow: ["status.rippling.com"] });
});

Deno.test("service: all operational is ok and reports the three relevant components", async () => {
  const { r, calls } = await run(summary());
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals((r as { state: string }).state, "ok");
  assertEquals(Object.keys((r as { components: object }).components).sort(), [
    "4t3nv95fsdms",
    "73fdn9j7bj7y",
    "lq3c3hps2qqf",
  ]);
});

Deno.test("service: Platform API major outage is down; partial outage is degraded", async () => {
  assertEquals(
    ((await run(summary({ [API_COMPONENT.id]: "major_outage" }))).r as { state: string }).state,
    "down",
  );
  const partial = (await run(summary({ [API_COMPONENT.id]: "partial_outage" }))).r as {
    state: string;
    components: Record<string, { message?: string }>;
  };
  assertEquals(partial.state, "degraded");
  assertStringIncludes(partial.components[API_COMPONENT.id].message!, "partial_outage");
});

Deno.test("service: the supporting components can only ever degrade, never down", async () => {
  const r = (await run(summary({ lq3c3hps2qqf: "major_outage" }))).r as { state: string };
  assertEquals(r.state, "degraded");
});

Deno.test("service: an unrelated component (Payroll) outage does not touch the verdict", async () => {
  const r = (await run(summary({ "2467w9pctv6m": "major_outage" }))).r as { state: string };
  assertEquals(r.state, "ok");
});

Deno.test("service: falls back to the component name when the id changes", async () => {
  const body = summary();
  body.components = body.components.map((c) =>
    c.name === "Platform API" ? { ...c, id: "renamed", status: "major_outage" } : c
  );
  assertEquals(((await run(body)).r as { state: string }).state, "down");
});

Deno.test("service: a foreign page id, a missing component, a bad status or a bad body is unknown, never down", async () => {
  const foreign = { ...summary(), page: { id: "other", name: "Rippling" } };
  assertEquals(((await run(foreign)).r as { state: string }).state, "unknown");

  const noApi = summary();
  noApi.components = noApi.components.filter((c) => c.name !== "Platform API");
  assertEquals(((await run(noApi)).r as { state: string }).state, "unknown");

  assertEquals(((await run({}, 503)).r as { state: string }).state, "unknown");
  assertEquals(((await run("<html>")).r as { state: string }).state, "unknown");
});

Deno.test("service: open incidents are noted in the message", async () => {
  const body = { ...summary(), incidents: [{ name: "Elevated latency" }] };
  const r = (await run(body)).r as { message?: string };
  assertStringIncludes(r.message ?? "", "1 open incident");
});
