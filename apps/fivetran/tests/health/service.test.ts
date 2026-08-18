import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const status = (indicator: string, description?: string) => ({
  status: 200,
  body: { status: { indicator, description }, page: { updated_at: "2026-08-18T19:31:13Z" } },
});

/**
 * Fivetran's status page publishes only status.json — components.json and
 * incidents.json both 404.
 */
Deno.test("service: reads the one endpoint that exists", async () => {
  const { ctx, calls } = mockCtx([status("none", "All Systems Operational")]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.fivetran.com/api/v2/status.json");
  assertEquals(result.state, "ok");
  assertEquals(result.message, "All Systems Operational");
});

Deno.test("service: minor is degraded, major and critical are down", async () => {
  for (
    const [indicator, state] of [["minor", "degraded"], ["major", "down"], ["critical", "down"]]
  ) {
    const { ctx } = mockCtx([status(indicator)]);
    assertEquals((await service.check!({}, ctx)).state, state, indicator);
  }
});

Deno.test("service: an unknown indicator is unknown, not assumed healthy", async () => {
  const { ctx } = mockCtx([status("something-new")]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/** A status page that itself fails tells us nothing about Fivetran. */
Deno.test("service: a broken or shapeless status page is unknown, never down", async () => {
  const broken = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, broken.ctx)).state, "unknown");

  const shapeless = mockCtx([{ status: 200, body: { page: {} } }]);
  const result = await service.check!({}, shapeless.ctx);
  assertEquals(result.state, "unknown");
  assert(/no indicator/.test(result.message!), result.message);
});

Deno.test("service: declares the status host, which is not the API host", () => {
  assertEquals(service.network!.allow, ["status.fivetran.com"]);
});

/** It is coarse on purpose, and says where the real question is answered. */
Deno.test("service: says it is the whole of what the vendor publishes", () => {
  assert(/answer 404/.test(service.description!), service.description);
});
