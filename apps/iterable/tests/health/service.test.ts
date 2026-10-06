import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const page = { id: "hm1wdv9pcjp9", name: "Iterable" };
const summary = (globalStatus: string, clusterStatus = "operational") => ({
  page,
  status: { indicator: "none" },
  components: [
    { name: "Cluster 5", group: true, status: "operational", group_id: null },
    { name: "Email Sends", status: clusterStatus, group_id: "g5" },
    { name: "Global API Success", status: globalStatus, group_id: null, group: false },
    { name: "Global Catalog", status: "operational", group_id: null, group: false },
  ],
});

Deno.test("service: unsigned service check, egress widened only to status.iterable.com", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.iterable.com"]);
});

Deno.test("service: all global components operational is ok, cluster groups ignored", async () => {
  const { ctx, calls } = mockCtx([{ body: summary("operational") }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.iterable.com/api/v2/summary.json");
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components ?? {}), ["global-api-success", "global-catalog"]);
});

Deno.test("service: a cluster-only incident does not degrade the app", async () => {
  const { ctx } = mockCtx([{ body: summary("operational", "major_outage") }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: a global outage is down, a partial one degraded", async () => {
  const down = mockCtx([{ body: summary("major_outage") }]);
  assertEquals((await service.check!({}, down.ctx)).state, "down");
  const deg = mockCtx([{ body: summary("partial_outage") }]);
  assertEquals((await service.check!({}, deg.ctx)).state, "degraded");
});

Deno.test("service: a page that is not Iterable's, or an unreachable one, is unknown", async () => {
  const wrong = mockCtx([{ body: { ...summary("operational"), page: { name: "Other" } } }]);
  assertEquals((await service.check!({}, wrong.ctx)).state, "unknown");
  const err = mockCtx([{ status: 500, body: {} }]);
  assertEquals((await service.check!({}, err.ctx)).state, "unknown");
});

Deno.test("service: no global components is unknown", async () => {
  const { ctx } = mockCtx([{ body: { page, components: [] } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});
