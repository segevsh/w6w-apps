import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const run = (responses: Parameters<typeof mockCtx>[0]) => {
  const m = mockCtx(responses);
  return Promise.resolve(service.check!({} as never, m.ctx)).then((r) => ({ r, calls: m.calls }));
};
const product = (status: string) => ({
  body: { key: "MCAccountEngagement", Instances: [{ key: "ACCOUNTENGAGEMENT", status }] },
});

Deno.test("service: asks Trust for the Account Engagement product, unsigned, on its own host", async () => {
  const { r, calls } = await run([product("OK")]);
  assertEquals(calls[0].url, "https://api.status.salesforce.com/v1/products/MCAccountEngagement");
  assertEquals(service.credential, "none");
  assertEquals(service.network, { allow: ["api.status.salesforce.com"] });
  assertEquals(r.state, "ok");
  assertEquals(r.components, { accountengagement: { state: "ok" } });
});

Deno.test("service: maps Trust's incident vocabulary", async () => {
  assertEquals((await run([product("MINOR_INCIDENT_CORE")])).r.state, "degraded");
  assertEquals((await run([product("MAJOR_INCIDENT_CORE")])).r.state, "down");
});

Deno.test("service: an unrecognised non-OK status reads degraded, never ok", async () => {
  assertEquals((await run([product("SOMETHING_NEW")])).r.state, "degraded");
});

Deno.test("service: the worst instance wins", async () => {
  const { r } = await run([{
    body: {
      key: "MCAccountEngagement",
      Instances: [{ key: "A", status: "OK" }, { key: "B", status: "MAJOR_INCIDENT_CORE" }],
    },
  }]);
  assertEquals(r.state, "down");
});

Deno.test("service: a Trust failure or a foreign 200 is unknown, never down or ok", async () => {
  assertEquals((await run([{ status: 503, body: "x" }])).r.state, "unknown");
  assertEquals(
    (await run([{ body: { key: "Other", Instances: [{ status: "OK" }] } }])).r.state,
    "unknown",
  );
  assertEquals((await run([{ body: "<html></html>" }])).r.state, "unknown");
  assertEquals(
    (await run([{ body: { key: "MCAccountEngagement", Instances: [] } }])).r.state,
    "unknown",
  );
});
