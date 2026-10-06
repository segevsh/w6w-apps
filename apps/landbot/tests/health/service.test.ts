import { assertEquals } from "@std/assert";
import service, { mapComponentStatus } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const page = { id: "x7zvlhcyj2mx", name: "Landbot" };
const comps = (over: Record<string, string> = {}) => {
  const rows: [string, string][] = [
    ["7g64ghy9tqmt", "Chats"],
    ["n6vnp7bk294m", "WhatsApp services"],
    ["q45fhv3p0nrc", "WhatsApp bots"],
    ["3yybf9wv6nyq", "Webhooks"],
    ["7qcz9118kt9z", "Builder"],
    ["l8c81mdplm0z", "Zapier"],
  ];
  return [
    ...rows.map(([id, name]) => ({ id, name, status: over[id] ?? "operational" })),
    { id: "rgzgrjk4f4sz", name: "Platform", status: "operational", group: true },
  ];
};
const run = (responses: Parameters<typeof mockCtx>[0]) =>
  service.check!({} as never, mockCtx(responses).ctx);

Deno.test("service: all operational is ok, group rows are skipped, and only the status host is hit", async () => {
  const { ctx, calls } = mockCtx([{ body: { page, components: comps() } }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components ?? {}).length, 6);
  assertEquals(calls[0].url, "https://status.landbot.io/api/v2/summary.json");
  assertEquals(service.network, { allow: ["status.landbot.io"] });
});

Deno.test("service: Chats decides down; channels cap at degraded; other components are detail", async () => {
  const chats = await run([{
    body: { page, components: comps({ "7g64ghy9tqmt": "major_outage" }) },
  }]);
  assertEquals(chats.state, "down");
  const wa = await run([{
    body: { page, components: comps({ "n6vnp7bk294m": "major_outage" }) },
  }]);
  assertEquals(wa.state, "degraded");
  const hook = await run([{
    body: { page, components: comps({ "3yybf9wv6nyq": "partial_outage" }) },
  }]);
  assertEquals(hook.state, "degraded");
  const builder = await run([{
    body: { page, components: comps({ "7qcz9118kt9z": "major_outage" }) },
  }]);
  assertEquals(builder.state, "ok");
  assertEquals(builder.message?.includes("Builder"), true);
});

Deno.test("service: wrong page, missing Chats or HTTP failure is unknown, never down", async () => {
  assertEquals(
    (await run([{ body: { page: { id: "zzz" }, components: comps() } }])).state,
    "unknown",
  );
  assertEquals(
    (await run([{
      body: { page, components: [{ id: "x", name: "Other", status: "operational" }] },
    }]))
      .state,
    "unknown",
  );
  assertEquals((await run([{ status: 500, body: "oops" }])).state, "unknown");
  assertEquals((await run([{ body: "not json", headers: {} }])).state, "unknown");
});

Deno.test("service: component status mapping", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
});
