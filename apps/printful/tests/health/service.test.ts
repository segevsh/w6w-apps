import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const page = (api: string, other = "operational", portal = "operational") => ({
  status: { indicator: "major" },
  components: [
    { id: "p2qdpn9x856q", name: "Shopify", status: other },
    { id: "4jrgcd93007y", name: "API", status: api },
    { id: "xs2dkww6r6tj", name: "Developer Portal", status: portal },
  ],
});
const run = async (r: Parameters<typeof mockCtx>[0]) => {
  const m = mockCtx(r);
  return { out: await service.check!({} as never, m.ctx), calls: m.calls };
};

Deno.test("service: reads the API component, not the page rollup", async () => {
  const { out, calls } = await run([{ body: page("operational", "major_outage") }]);
  assertEquals(out.state, "ok");
  assertEquals(out.components!["api"].state, "ok");
  assertEquals(calls[0].url, "https://www.printfulstatus.com/api/v2/summary.json");
});

Deno.test("service: component statuses map to states", async () => {
  assertEquals((await run([{ body: page("major_outage") }])).out.state, "down");
  assertEquals((await run([{ body: page("partial_outage") }])).out.state, "degraded");
  const { out } = await run([{ body: page("operational", "operational", "degraded_performance") }]);
  assertEquals(out.components!["developer-portal"].state, "degraded");
});

Deno.test("service: a missing component or a failing page is unknown, never down", async () => {
  assertEquals((await run([{ body: { components: [] } }])).out.state, "unknown");
  assertEquals((await run([{ status: 500, body: "x" }])).out.state, "unknown");
  assertEquals((await run([{ body: "not json" }])).out.state, "unknown");
});

Deno.test("service: declares only the status host and is unsigned", () => {
  assertEquals(service.network, { allow: ["www.printfulstatus.com"] });
  assertEquals(service.kind, "service");
});
