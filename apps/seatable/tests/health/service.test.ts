import { assertEquals } from "@std/assert";
import service, { COMPONENT_KEY, STATUS_HOST, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const run = async (res: { status?: number; body?: unknown }) => {
  const { ctx, calls } = mockCtx([res]);
  const report = await service.check!({}, ctx);
  return { report, calls };
};

const endpoint = (result: Record<string, unknown> | null, key = COMPONENT_KEY) => ({
  name: "Cloud API (Base Operations)",
  group: "SeaTable Cloud",
  key,
  results: result ? [result] : [],
});

Deno.test("service: asks the single Base Operations component, unsigned-host only", async () => {
  const { calls } = await run({ body: endpoint({ success: true, state: "healthy" }) });
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(
    STATUS_URL,
    "https://status.seatable.com/api/v1/endpoints/seatable-cloud_cloud-api-(base-operations)/statuses?page=1&pageSize=1",
  );
  assertEquals(service.network?.allow, [STATUS_HOST]);
  assertEquals(service.credential, "none");
});

Deno.test("service: a successful latest probe is ok", async () => {
  const { report } = await run({ body: endpoint({ success: true, state: "healthy" }) });
  assertEquals(report.state, "ok");
});

Deno.test("service: a degraded probe is degraded", async () => {
  const { report } = await run({
    body: endpoint({ success: false, state: "degraded", timestamp: "2026-10-05T08:45:29Z" }),
  });
  assertEquals(report.state, "degraded");
});

Deno.test("service: a failed probe with any other state is down", async () => {
  const { report } = await run({ body: endpoint({ success: false, state: "unhealthy" }) });
  assertEquals(report.state, "down");
});

Deno.test("service: a broken status API is unknown, never down", async () => {
  assertEquals((await run({ status: 503, body: "oops" })).report.state, "unknown");
});

Deno.test("service: an unreadable body is unknown", async () => {
  assertEquals((await run({ body: "<html>shell</html>" })).report.state, "unknown");
});

Deno.test("service: a different component key is unknown (page re-keyed or swapped)", async () => {
  const { report } = await run({ body: endpoint({ success: true }, "other_component") });
  assertEquals(report.state, "unknown");
});

Deno.test("service: no results is unknown", async () => {
  assertEquals((await run({ body: endpoint(null) })).report.state, "unknown");
});
