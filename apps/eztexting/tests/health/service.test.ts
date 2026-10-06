import { assert, assertEquals } from "@std/assert";
import service, { mapComponentStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const summary = (apiStatus: string, extra: Record<string, unknown>[] = [], page = {}) => ({
  page: {
    id: "nmm9j2skbrxf",
    name: "EZ Texting Status",
    url: "https://status.eztexting.com",
    ...page,
  },
  status: { indicator: "none", description: "All Systems Operational" },
  components: [
    { id: "g1", name: "EZ Texting Services", status: "operational", group: true },
    { id: "a1", name: "EZ Texting API", status: apiStatus, group: false },
    { id: "s1", name: "SMS - Long Codes", status: "operational", group: false },
    { id: "c1", name: "CallFire API", status: "major_outage", group: false },
    ...extra,
  ],
});

const run = async (body: unknown, status = 200) => {
  const m = mockCtx([{ status, body }]);
  const r = await service.check!({} as never, m.ctx as never);
  return { r, calls: m.calls };
};

Deno.test("service: fetches the Statuspage summary on its own host, unsigned", async () => {
  const { r, calls } = await run(summary("operational"));
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.eztexting.com"]);
  assertEquals(r.state, "ok");
});

Deno.test("service: the verdict is the EZ Texting API component — CallFire's outage is ignored", async () => {
  const { r } = await run(summary("operational"));
  assertEquals(r.state, "ok");
  assert(!JSON.stringify(r.components).includes("callfire"), JSON.stringify(r.components));
});

Deno.test("service: partial outage degrades, major outage is down", async () => {
  assertEquals((await run(summary("partial_outage"))).r.state, "degraded");
  assertEquals((await run(summary("major_outage"))).r.state, "down");
});

Deno.test("service: another pipeline component is reported but does not move the verdict", async () => {
  const { r } = await run(summary("operational", [
    { id: "s2", name: "MMS - Long Codes", status: "degraded_performance", group: false },
  ]));
  assertEquals(r.state, "ok");
  assert(r.message?.includes("MMS - Long Codes"), r.message);
});

Deno.test("service: no API component, a foreign page or a broken page is unknown, never down", async () => {
  const noApi = summary("operational");
  noApi.components = noApi.components.filter((c) => c.name !== "EZ Texting API");
  assertEquals((await run(noApi)).r.state, "unknown");
  assertEquals(
    (await run(summary("operational", [], { name: "Someone Else" }))).r.state,
    "unknown",
  );
  assertEquals(
    (await run(summary("operational", [], { url: "https://status.other.com" }))).r.state,
    "unknown",
  );
  assertEquals((await run({ nope: true })).r.state, "unknown");
  assertEquals((await run("down", 503)).r.state, "unknown");
});

Deno.test("service: mapComponentStatus covers Atlassian's vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
});
