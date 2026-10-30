import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service, {
  COMPONENTS_URL,
  mapComponentStatus,
  mapPageStatus,
  SUMMARY_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const page = (status: string, name = "Podium") => ({ body: { page: { name, status } } });
const comps = (api: string, other = "OPERATIONAL") => ({
  body: {
    components: [
      { id: "c1", name: "Public API", status: api },
      { id: "c2", name: "Web Application", status: other },
    ],
  },
});

test("service: declares the Instatus host, no credential, app scope", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.podium.com"]);
  assertEquals(SUMMARY_URL, "https://status.podium.com/summary.json");
  assertEquals(COMPONENTS_URL, "https://status.podium.com/v2/components.json");
});

test("service: Public API operational is ok even when another component is down", async () => {
  const { ctx, calls } = mockCtx([page("HASISSUES"), comps("OPERATIONAL", "MAJOROUTAGE")]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls.map((c) => c.url), [SUMMARY_URL, COMPONENTS_URL]);
  assertEquals(r.components?.c2.state, "down");
});

test("service: a Public API outage drives the verdict", async () => {
  const { ctx } = mockCtx([page("HASISSUES"), comps("MAJOROUTAGE")]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "down");
});

test("service: a missing Public API component falls back to the page status, loudly", async () => {
  const { ctx } = mockCtx([page("UP"), {
    body: { components: [{ id: "x", name: "Other", status: "OPERATIONAL" }] },
  }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.message?.includes("Public API"), true);
});

test("service: a failing or foreign status page is unknown, never down", async () => {
  assertEquals(
    (await service.check!({} as never, mockCtx([{ status: 500 }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({} as never, mockCtx([page("UP", "Other")]).ctx)).state,
    "unknown",
  );
  assertEquals((await service.check!({} as never, mockCtx([{ body: {} }]).ctx)).state, "unknown");
});

test("service: component failure does not discard the page verdict", async () => {
  const { ctx } = mockCtx([page("UP"), { status: 500 }]);
  assertEquals((await service.check!({} as never, ctx)).state, "ok");
});

test("service: status vocabularies map as documented", () => {
  assertEquals(
    ["UP", "HASISSUES", "UNDERMAINTENANCE", "?"].map(mapPageStatus),
    ["ok", "degraded", "degraded", "unknown"],
  );
  assertEquals(
    ["OPERATIONAL", "PARTIALOUTAGE", "MAJOROUTAGE", "?"].map(mapComponentStatus),
    ["ok", "degraded", "down", "unknown"],
  );
});
