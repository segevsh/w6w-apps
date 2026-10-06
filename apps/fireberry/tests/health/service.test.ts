import { assertEquals } from "@std/assert";
import check, { mapComponentStatus, PAGE_ID } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const summary = (api: string, extra: Array<{ name: string; status: string }> = []) => ({
  page: { id: PAGE_ID, name: "Fireberry" },
  status: { indicator: "none", description: "All Systems Operational" },
  components: [{ name: "App", status: "operational" }, { name: "API", status: api }, ...extra],
});

Deno.test("service: API operational is ok and the call goes to the pinned status host", async () => {
  const { ctx, calls } = mockCtx([{ body: summary("operational") }]);
  const r = await check.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(new URL(calls[0].url).host, "fireberry.statuspage.io");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/summary.json");
});

Deno.test("service: the API component decides; other components are detail only", async () => {
  const other = mockCtx([{
    body: summary("operational", [{ name: "Billing", status: "major_outage" }]),
  }]);
  const r1 = await check.check!({} as never, other.ctx);
  assertEquals(r1.state, "ok");
  assertEquals(r1.components!["billing"].state, "down");
  const down = mockCtx([{ body: summary("major_outage") }]);
  assertEquals((await check.check!({} as never, down.ctx)).state, "down");
  const deg = mockCtx([{ body: summary("partial_outage") }]);
  assertEquals((await check.check!({} as never, deg.ctx)).state, "degraded");
});

Deno.test("service: a wrong page, missing API component, 5xx or bad JSON is unknown, never down", async () => {
  const wrong = mockCtx([{
    body: { ...summary("operational"), page: { id: "x", name: "Other" } },
  }]);
  assertEquals((await check.check!({} as never, wrong.ctx)).state, "unknown");
  const noApi = mockCtx([{
    body: {
      page: { id: PAGE_ID, name: "Fireberry" },
      components: [{ name: "App", status: "operational" }],
    },
  }]);
  assertEquals((await check.check!({} as never, noApi.ctx)).state, "unknown");
  const err = mockCtx([{ status: 503 }]);
  assertEquals((await check.check!({} as never, err.ctx)).state, "unknown");
  const bad = mockCtx([{ body: "not json" }]);
  assertEquals((await check.check!({} as never, bad.ctx)).state, "unknown");
});

Deno.test("service: component status mapping", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(check.network, { allow: ["fireberry.statuspage.io"] });
});
