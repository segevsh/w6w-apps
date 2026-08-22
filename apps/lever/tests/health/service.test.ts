import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/service.ts";
import quota from "../../health/quota.ts";

const GLOBAL = { display: { dataCenter: "global" } };
const EU = { display: { dataCenter: "eu" } };

/** Every component name appears once per data centre. */
const summary = (globalApi: string, euApi: string, extra: Record<string, string> = {}) => ({
  status: 200,
  body: {
    components: [
      { id: "g", name: "Global Data Center - LeverTRM", group: true },
      { id: "e", name: "EU Data Center - LeverTRM", group: true },
      { id: "1", name: "Integration API & Webhooks", status: globalApi, group_id: "g" },
      { id: "2", name: "Integration API & Webhooks", status: euApi, group_id: "e" },
      { id: "3", name: "Hire", status: extra.globalHire ?? "operational", group_id: "g" },
      { id: "4", name: "Hire", status: extra.euHire ?? "operational", group_id: "e" },
      { id: "5", name: "Slack", status: "major_outage", group_id: "t" },
    ],
    incidents: [],
  },
});

const run = (ctx: Parameters<NonNullable<typeof check.check>>[1]) => check.check!({}, ctx);

Deno.test("service: reads the API component for the connection's data centre", async () => {
  const { ctx, calls } = mockCtx([summary("operational", "major_outage")], GLOBAL);
  const result = await run(ctx);
  assertEquals(calls[0].url, "https://status.lever.co/api/v2/summary.json");
  assertEquals(result.state, "ok", "the EU outage is somebody else's");
  assert(/global data centre/.test(result.message!), result.message);
});

/** The whole point: a name match alone would report the wrong region. */
Deno.test("service: the EU connection sees the EU row", async () => {
  const { ctx } = mockCtx([summary("operational", "major_outage")], EU);
  const result = await run(ctx);
  assertEquals(result.state, "down");
  assert(/eu data centre/.test(result.message!), result.message);
});

/** The API and the product fail separately. */
Deno.test("service: a Hire outage is degraded and named as the product", async () => {
  const { ctx } = mockCtx([
    summary("operational", "operational", { globalHire: "partial_outage" }),
  ], GLOBAL);
  const result = await run(ctx);
  assertEquals(result.state, "degraded");
  assert(/recruiters cannot work/.test(result.message!), result.message);
});

/** Third-party components are somebody else's software. */
Deno.test("service: a partner outage does not change the verdict", async () => {
  const { ctx } = mockCtx([summary("operational", "operational")], GLOBAL);
  assertEquals((await run(ctx)).state, "ok");
});

Deno.test("service: a renamed group is unknown rather than an outage", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { components: [{ id: "x", name: "Data Center", group: true }] },
  }], GLOBAL);
  const result = await run(ctx);
  assertEquals(result.state, "unknown");
  assert(/renamed or restructured/.test(result.message!), result.message);
});

Deno.test("service: a missing API component under a real group is unknown too", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [
        { id: "g", name: "Global Data Center - LeverTRM", group: true },
        { id: "3", name: "Hire", status: "operational", group_id: "g" },
      ],
    },
  }], GLOBAL);
  assertEquals((await run(ctx)).state, "unknown");
});

Deno.test("service: an unreachable or non-JSON status page is unknown", async () => {
  const down = mockCtx([{ status: 503, body: "" }], GLOBAL);
  assertEquals((await run(down.ctx)).state, "unknown");
  const html = mockCtx([{ status: 200, body: "<html>" }], GLOBAL);
  assertEquals((await run(html.ctx)).state, "unknown");
});

/** Lever publishes no rate-limit header at all. */
Deno.test("quota: is a declared absence naming the cursor as the real constraint", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assert(/no rate-limit headers/.test(quota.unavailable!.reason), quota.unavailable!.reason);
  assert(/inherently sequential/.test(quota.unavailable!.reason), quota.unavailable!.reason);
});
