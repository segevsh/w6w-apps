import { assert, assertEquals } from "@std/assert";
import service, { mapPageStatus, STATUS_HOST, SUMMARY_URL } from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const page = (status: string, name = "EdenAI") => ({
  page: { name, url: "https://app-edenai.instatus.com", status },
});

Deno.test("service: probes the status host, declared on the hook not the app", () => {
  assertEquals(STATUS_HOST, "app-edenai.instatus.com");
  assertEquals(SUMMARY_URL, "https://app-edenai.instatus.com/summary.json");
  assertEquals(service.network?.allow, ["app-edenai.instatus.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: an UP page reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: page("UP") }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, SUMMARY_URL);
  assertEquals(report.state, "ok");
});

Deno.test("service: HASISSUES and UNDERMAINTENANCE report degraded", async () => {
  for (const s of ["HASISSUES", "UNDERMAINTENANCE"]) {
    const report = await service.check!({}, mockCtx([{ body: page(s) }]).ctx);
    assertEquals(report.state, "degraded", s);
  }
});

Deno.test("service: an unseen status value is unknown, never a guess", () => {
  assertEquals(mapPageStatus("SOMETHINGNEW"), "unknown");
  assertEquals(mapPageStatus(undefined), "unknown");
});

Deno.test("service: a page that no longer self-identifies as Eden AI is unknown", async () => {
  const report = await service.check!({}, mockCtx([{ body: page("UP", "SomeoneElse") }]).ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a broken status API is unknown, never down", async () => {
  const a = await service.check!({}, mockCtx([{ status: 503, body: "" }]).ctx);
  assertEquals(a.state, "unknown");
  const b = await service.check!({}, mockCtx([{ body: "<html>" }]).ctx);
  assertEquals(b.state, "unknown");
});

Deno.test("quota: declared unavailable at informational severity", () => {
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason.length);
  assertEquals(quota.check, undefined);
});
