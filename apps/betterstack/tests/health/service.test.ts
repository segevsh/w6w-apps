import { assertEquals } from "@std/assert";
import service, { mapResourceStatus, PAGE_ID, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function page(
  resources: Array<{ id: string; section: string; name: string; status: string }>,
  over: Record<string, unknown> = {},
) {
  return {
    data: {
      id: PAGE_ID,
      attributes: {
        custom_domain: "status.betterstack.com",
        aggregate_state: "operational",
        ...over,
      },
    },
    included: [
      { id: "1", type: "status_page_section", attributes: { name: "Better Stack " } },
      { id: "2", type: "status_page_section", attributes: { name: "Uptime" } },
      { id: "3", type: "status_page_section", attributes: { name: "Telemetry" } },
      ...resources.map((r) => ({
        id: r.id,
        type: "status_page_resource",
        attributes: {
          status_page_section_id: Number(r.section),
          public_name: r.name,
          status: r.status,
        },
      })),
      { id: "x", type: "status_report", attributes: { title: "ignored" } },
    ],
  };
}

const base = [
  { id: "10", section: "1", name: "Better Stack", status: "operational" },
  { id: "11", section: "2", name: "Uptime", status: "operational" },
  { id: "12", section: "2", name: "Uptime backend processing health", status: "not_monitored" },
  { id: "13", section: "3", name: "Telemetry", status: "operational" },
];

Deno.test("service: reads the .json index on status.betterstack.com", () => {
  assertEquals(STATUS_URL, "https://status.betterstack.com/index.json");
  assertEquals(service.network?.allow, ["status.betterstack.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: all covered components operational -> ok, not_monitored skipped", async () => {
  const { ctx, calls } = mockCtx([{ body: page(base) }]);
  const out = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components ?? {}).sort(), ["10", "11"]);
});

Deno.test("service: a Telemetry outage does not report the Uptime API down", async () => {
  const resources = base.map((r) => r.id === "13" ? { ...r, status: "downtime" } : r);
  const { ctx } = mockCtx([{ body: page(resources, { aggregate_state: "downtime" }) }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals("13" in (out.components ?? {}), false);
});

Deno.test("service: an Uptime downtime is down, and names the component", async () => {
  const resources = base.map((r) => r.id === "11" ? { ...r, status: "downtime" } : r);
  const { ctx } = mockCtx([{ body: page(resources) }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
  assertEquals(out.components?.["11"].state, "down");
  assertEquals(out.message, "affected: Uptime (downtime)");
});

Deno.test("service: degraded and maintenance are degraded", async () => {
  for (const status of ["degraded", "maintenance"]) {
    const resources = base.map((r) => r.id === "10" ? { ...r, status } : r);
    const { ctx } = mockCtx([{ body: page(resources) }]);
    assertEquals((await service.check!({}, ctx)).state, "degraded", status);
  }
});

Deno.test("service: an unknown resource status is unknown, never ok", () => {
  assertEquals(mapResourceStatus("mystery"), "unknown");
  assertEquals(mapResourceStatus(undefined), "unknown");
  assertEquals(mapResourceStatus("not_monitored"), null);
});

Deno.test("service: a page that is not Better Stack's is unknown", async () => {
  const { ctx } = mockCtx([{ body: page(base, { custom_domain: "status.other.example" }) }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");

  const wrongId = page(base);
  wrongId.data.id = "1";
  const second = mockCtx([{ body: wrongId }]);
  assertEquals((await service.check!({}, second.ctx)).state, "unknown");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  for (const r of [{ status: 500, body: "x" }, { status: 200, body: "<html>" }]) {
    const { ctx } = mockCtx([{ ...r, headers: {} }]);
    assertEquals((await service.check!({}, ctx)).state, "unknown");
  }
});

Deno.test("service: no covered components is unknown", async () => {
  const { ctx } = mockCtx([{
    body: page([{ id: "13", section: "3", name: "Telemetry", status: "operational" }]),
  }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});
