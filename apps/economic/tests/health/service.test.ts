import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const page = (restStatus: string, indicator = "none", id = "834xxvq1gy9f") => ({
  page: { id, name: "e-conomic" },
  status: { indicator },
  components: [
    { id: "kt2wx7z07pjx", name: "Web Application", status: "major_outage" },
    { id: "699m4x1lpl30", name: "API", status: "operational", group: true },
    { id: "7v5vbfhgbs2x", name: "REST API", status: restStatus },
  ],
});

Deno.test("service: widened only for the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.e-conomic.com"]);
});

Deno.test("service: the verdict is the REST API component, not the whole-page indicator", async () => {
  const { ctx, calls } = mockCtx([{ body: page("operational", "major") }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.e-conomic.com/api/v2/summary.json");
  assertEquals(r.state, "ok");
  assertEquals(r.components?.["web-application"]?.state, "down");
  assertEquals(r.components?.["rest-api"]?.state, "ok");
  assertEquals(r.components?.["api"], undefined);
});

Deno.test("service: REST API incidents map to degraded / down", async () => {
  const d = await service.check!({}, mockCtx([{ body: page("partial_outage") }]).ctx);
  assertEquals(d.state, "degraded");
  const o = await service.check!({}, mockCtx([{ body: page("major_outage") }]).ctx);
  assertEquals(o.state, "down");
});

Deno.test("service: a wrong page id, a missing component or a failing page is unknown", async () => {
  const wrong = await service.check!(
    {},
    mockCtx([{ body: page("operational", "none", "other") }]).ctx,
  );
  assertEquals(wrong.state, "unknown");
  const none = await service.check!(
    {},
    mockCtx([{ body: { page: { id: "834xxvq1gy9f" }, components: [] } }]).ctx,
  );
  assertEquals(none.state, "unknown");
  const fail = await service.check!({}, mockCtx([{ status: 503, body: "x" }]).ctx);
  assertEquals(fail.state, "unknown");
});
