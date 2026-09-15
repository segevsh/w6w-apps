import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import instance from "../../health/instance.ts";

Deno.test("service: is a real, dedicated Statuspage probe, not a declared absence", () => {
  assertEquals(service.unavailable, undefined);
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.clerk.com"]);
});

Deno.test("service: maps an operational summary to ok with per-component detail", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      page: { name: "Clerk" },
      status: { indicator: "none", description: "All Systems Operational" },
      components: [{ name: "Email delivery", status: "operational" }],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.components?.["email-delivery"].state, "ok");
  assertEquals(new URL(calls[0].url).host, "status.clerk.com");
});

Deno.test("service: a major incident maps to down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: { indicator: "major" }, components: [] },
  }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: a broken status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("instance: reports the environment type on success", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { object: "instance", id: "ins_1", environment_type: "production" },
  }]);
  const out = await instance.check!({}, ctx);
  assertEquals(out.state, "ok");
  assert(out.message!.includes("production"), out.message);
  assertEquals(new URL(calls[0].url).pathname, "/v1/instance");
});

/** Credential failures belong to the derived `auth:secret-key` check. */
Deno.test("instance: a 401 is unknown and gets out of the way", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const out = await instance.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("instance: rate limiting is degraded, not down", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "" }]);
  assertEquals((await instance.check!({}, ctx)).state, "degraded");
});

Deno.test("instance: is a connection-scoped signed dependency check", () => {
  assertEquals(instance.kind, "dependency");
  assertEquals(instance.scope, "connection");
  assertEquals(instance.credential, "signed");
});
