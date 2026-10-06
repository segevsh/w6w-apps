import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT,
  mapComponentStatus,
  mapIndicator,
  PAGE_NAME,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** The six components measured live on 2026-10-06 (all operational). */
const NAMES = [
  "Chat widget",
  "Agent apps",
  API_COMPONENT,
  "Integrations",
  "Support chat on www.livechat.com",
  "Subprocessors' service",
];

function summary(overrides: Record<string, string> = {}, extra: Record<string, unknown> = {}) {
  return {
    page: { id: "p", name: PAGE_NAME, url: "https://status.livechat.com/" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: NAMES.map((name) => ({
      id: `id-${name}`,
      name,
      status: overrides[name] ?? "operational",
    })),
    ...extra,
  };
}

Deno.test("service: probes the status host, unauthenticated, with its own allowlist", () => {
  assertEquals(STATUS_URL, "https://status.livechat.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.livechat.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
});

Deno.test("service: maps Statuspage's vocabularies", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("nope"), "unknown");
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: all operational is ok and reports every component", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const out = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components!).length, NAMES.length);
});

Deno.test("service: the API component decides the verdict", async () => {
  const { ctx } = mockCtx([{ body: summary({ [API_COMPONENT]: "major_outage" }) }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(out.message!.includes("API (major_outage)"));
});

Deno.test("service: an unrelated component never moves the verdict", async () => {
  const { ctx } = mockCtx([{ body: summary({ "Chat widget": "major_outage" }) }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.components!["id-Chat widget"].state, "down");
  assert(out.message!.includes("Chat widget (major_outage)"));
});

Deno.test("service: without an API component the page indicator decides", async () => {
  const body = summary({}, { status: { indicator: "major" } });
  body.components = body.components.filter((c) => c.name !== API_COMPONENT);
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: open incidents are mentioned", async () => {
  const { ctx } = mockCtx([{ body: summary({}, { incidents: [{ id: "i" }] }) }]);
  assert((await service.check!({}, ctx)).message!.includes("1 open incident"));
});

Deno.test("service: unknown when the page is not LiveChat's, empty, unreadable or erroring", async () => {
  const other = mockCtx([{ body: { ...summary(), page: { name: "Someone Else" } } }]);
  assertEquals((await service.check!({}, other.ctx)).state, "unknown");
  const empty = mockCtx([{ body: summary({}, { components: [] }) }]);
  assertEquals((await service.check!({}, empty.ctx)).state, "unknown");
  const html = mockCtx([{ body: "<html>" }]);
  assertEquals((await service.check!({}, html.ctx)).state, "unknown");
  const err = mockCtx([{ status: 503, body: {} }]);
  assertEquals((await service.check!({}, err.ctx)).state, "unknown");
});
