import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { mapComponentStatus, mapIndicator, STATUS_URL } from "../../health/service.ts";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";

const SUMMARY = {
  page: { id: "lzyb14vndwyk", name: "SignWell", url: "https://status.signwell.com" },
  components: [{
    id: "rmblmhzjvg3d",
    name: "Docsketch Service",
    status: "operational",
    group: false,
  }],
  incidents: [],
  scheduled_maintenances: [],
  status: { indicator: "none", description: "All Systems Operational" },
};

// deno-lint-ignore no-explicit-any
const run = (check: any, ctx: any) => check.check({}, ctx);

Deno.test("service: reads the Statuspage summary and passes on indicator none", async () => {
  const { ctx, calls } = mockCtx([{ body: SUMMARY }]);
  const out = await run(service, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(STATUS_URL, "https://status.signwell.com/api/v2/summary.json");
  assertEquals(out.state, "ok");
  assertEquals(out.components.rmblmhzjvg3d, { state: "ok", message: "Docsketch Service" });
});

Deno.test("service: is informational, unsigned, and scoped to the status host", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
  assertEquals(service.network, { allow: ["status.signwell.com"] });
});

Deno.test("service: the page-level indicator is the verdict", async () => {
  for (
    const [indicator, state] of [["minor", "degraded"], ["major", "degraded"], ["critical", "down"]]
  ) {
    const { ctx } = mockCtx([{
      body: {
        ...SUMMARY,
        status: { indicator, description: "x" },
        incidents: [{ name: "i" }],
      },
    }]);
    const out = await run(service, ctx);
    assertEquals(out.state, state, indicator);
    assert(out.message.includes("1 open incident(s)"));
  }
  assertEquals(mapIndicator("nonsense"), "unknown");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
});

Deno.test("service: a page that is not SignWell's, or not Statuspage-shaped, is unknown", async () => {
  const other = mockCtx([{ body: { ...SUMMARY, page: { name: "Someone Else" } } }]);
  assertEquals((await run(service, other.ctx)).state, "unknown");
  const shapeless = mockCtx([{ body: { page: { name: "SignWell" } } }]);
  assertEquals((await run(service, shapeless.ctx)).state, "unknown");
  const broken = mockCtx([{ status: 503, body: "oops" }]);
  assertEquals((await run(service, broken.ctx)).state, "unknown");
  const unreadable = mockCtx([{ body: "<html></html>" }]);
  assertEquals((await run(service, unreadable.ctx)).state, "unknown");
});

Deno.test("api: a schema-correct 401 is a pass, from the body, with no credential sent", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: {
      message: "Missing or invalid authorization key",
      meta: { error: "missing_authorization_key_error", message: "Missing authorization key" },
    },
  }]);
  const out = await run(api, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/me");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(api.credential, "none");
  assertEquals(api.kind, "dependency");
});

Deno.test("api: a 5xx, an HTML shell, and a foreign JSON body are not passes", async () => {
  const down = mockCtx([{ status: 502, body: { message: "bad gateway" } }]);
  assertEquals((await run(api, down.ctx)).state, "down");
  const shell = mockCtx([{ status: 200, body: "<html>shell</html>" }]);
  assertEquals((await run(api, shell.ctx)).state, "down");
  const foreign = mockCtx([{ status: 200, body: { hello: "world" } }]);
  assertEquals((await run(api, foreign.ctx)).state, "unknown");
});

Deno.test("quota: a declared absence with informational severity (else unknown pins forever)", () => {
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.length > 0);
  assertEquals(quota.check, undefined);
});
