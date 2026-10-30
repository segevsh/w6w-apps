import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service, {
  COMPONENTS_URL,
  mapComponentStatus,
  mapPageStatus,
  SUMMARY_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const PAGE = (status: string, name = "Plaud Developer") => ({
  body: { page: { name, url: "https://status.plaud.ai", status } },
});

test("service: probes the status host only, never the API host", () => {
  assertEquals(SUMMARY_URL, "https://status.plaud.ai/summary.json");
  assertEquals(COMPONENTS_URL, "https://status.plaud.ai/v2/components.json");
  assertEquals(service.network?.allow, ["status.plaud.ai"]);
  assertEquals(service.credential, "none");
});

test("service: an UP page reports ok", async () => {
  const { ctx, calls } = mockCtx([
    PAGE("UP"),
    {
      body: {
        components: [{
          id: "c1",
          name: "US",
          status: "OPERATIONAL",
          group: { name: "ASR Service" },
        }],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, SUMMARY_URL);
  assertEquals(calls[1].url, COMPONENTS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.c1.message, "ASR Service US");
});

test("service: HASISSUES is degraded and names the affected component", async () => {
  const { ctx } = mockCtx([
    PAGE("HASISSUES"),
    {
      body: {
        components: [{
          id: "c1",
          name: "US",
          status: "PARTIALOUTAGE",
          group: { name: "ASR Service" },
        }],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(/ASR Service US \(PARTIALOUTAGE\)/.test(report.message ?? ""), report.message);
});

test("service: a page that names someone else is unknown, not ok", async () => {
  const { ctx } = mockCtx([PAGE("UP", "Somebody Else")]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

test("service: status API failure is unknown, never down; components are best effort", async () => {
  const bad = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, bad.ctx)).state, "unknown");
  const noComp = mockCtx([PAGE("UP"), { status: 503, body: "" }]);
  const r = await service.check!({}, noComp.ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.components, undefined);
});

test("service: status vocabularies", () => {
  assertEquals(mapPageStatus("UNDERMAINTENANCE"), "degraded");
  assertEquals(mapPageStatus("???"), "unknown");
  assertEquals(mapComponentStatus("MAJOROUTAGE"), "down");
  assertEquals(mapComponentStatus("OPERATIONAL"), "ok");
});
