import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const page = (status: string, id = "02cw9qfm3jdr") => ({
  page: { id, name: "Demio" },
  status: { indicator: "major" },
  components: [
    { name: "User Dashboard", status, group: false },
    { name: "AWS rds-us-east-1", status: "major_outage", group: false },
  ],
});

// deno-lint-ignore no-explicit-any
const run = (c: any, ctx: any) => c.check({}, ctx);

Deno.test("service: verdict comes from User Dashboard, not the page indicator or AWS", async () => {
  const { ctx, calls } = mockCtx([{ body: page("operational") }]);
  const r = await run(service, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, "https://status.demio.com/api/v2/summary.json");
});

Deno.test("service: maps partial and major outages", async () => {
  assertEquals(
    (await run(service, mockCtx([{ body: page("partial_outage") }]).ctx)).state,
    "degraded",
  );
  assertEquals((await run(service, mockCtx([{ body: page("major_outage") }]).ctx)).state, "down");
});

Deno.test("service: wrong page id, missing component and HTTP errors are unknown, never down", async () => {
  assertEquals(
    (await run(service, mockCtx([{ body: page("operational", "other") }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await run(service, mockCtx([{ body: { page: { id: "02cw9qfm3jdr" }, components: [] } }]).ctx))
      .state,
    "unknown",
  );
  assertEquals((await run(service, mockCtx([{ status: 503, body: "x" }]).ctx)).state, "unknown");
});

Deno.test("service and quota both declare informational severity; quota is unavailable", () => {
  assertEquals(service.severity, "informational");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals(quota.check, undefined);
  assertEquals(service.network?.allow, ["status.demio.com"]);
});
