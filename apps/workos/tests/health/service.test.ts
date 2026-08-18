import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const page = (components: Array<Record<string, unknown>>) => ({
  status: 200,
  body: { components },
});

Deno.test("service: reads the Statuspage components and rolls them up", async () => {
  const { ctx, calls } = mockCtx([
    page([
      { name: "API", status: "operational" },
      { name: "SSO", status: "operational" },
      { name: "Directory Sync", status: "operational" },
      { name: "Marketing site", status: "major_outage" },
    ]),
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.workos.com/api/v2/components.json");
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components!).sort(), ["api", "directory-sync", "sso"]);
});

/**
 * SSO being down stops an entire customer's staff logging in, whatever this app
 * happens to be doing, so it counts at full weight.
 */
Deno.test("service: an SSO outage is down, not a footnote", async () => {
  const { ctx } = mockCtx([
    page([
      { name: "API", status: "operational" },
      { name: "SSO", status: "major_outage" },
    ]),
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(result.message!.includes("SSO"), result.message);
});

Deno.test("service: degraded performance is degraded, not down", async () => {
  const { ctx } = mockCtx([page([{ name: "API", status: "degraded_performance" }])]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: component groups are skipped, not counted twice", async () => {
  const { ctx } = mockCtx([
    page([
      { name: "API", status: "major_outage", group: true },
      { name: "API", status: "operational" },
    ]),
  ]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

/** A status page that itself fails tells us nothing about WorkOS. */
Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");

  const bad = mockCtx([{ status: 200, body: { nope: true } }]);
  assertEquals((await service.check!({}, bad.ctx)).state, "unknown");
});

Deno.test("service: a page that no longer names the watched components says so", async () => {
  const { ctx } = mockCtx([page([{ name: "Corporate blog", status: "operational" }])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/no longer names/.test(result.message!), result.message);
});

Deno.test("service: declares the status host, which is not the API host", () => {
  assertEquals(service.network!.allow, ["status.workos.com"]);
});
