import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import instance from "../../health/instance.ts";

const pong = (appName = "HCP Terraform", apiVersion = "2.6") => ({
  status: 204,
  headers: { "tfp-appname": appName, "tfp-api-version": apiVersion },
});

const connected = { host: "https://app.terraform.io", appName: "HCP Terraform", apiVersion: "2.6" };

/** A revoked token must not read as an outage. */
Deno.test("instance: pings unauthenticated, so a bad credential is not an outage", async () => {
  const { ctx, calls } = mockCtx([pong()], { display: connected });
  const result = await instance.check!({}, ctx);
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/ping");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result.state, "ok");
  assert(/HCP Terraform/.test(result.message!), result.message);
  assert(/API 2\.6/.test(result.message!), result.message);
});

/** This is the only check that speaks for a self-hosted instance. */
Deno.test("instance: pings the connection's own host, not HashiCorp's", async () => {
  const { ctx, calls } = mockCtx([pong("Terraform Enterprise", "2.5")], {
    display: { host: "https://tfe.example.com" },
  });
  const result = await instance.check!({}, ctx);
  assertEquals(calls[0].url, "https://tfe.example.com/api/v2/ping");
  assertEquals(result.state, "ok");
  assert(/Terraform Enterprise/.test(result.message!), result.message);
});

Deno.test("instance: an unreachable host is down", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("connection refused")),
    log: () => {},
    connection: { display: { host: "https://tfe.example.com" } },
  } as unknown as Parameters<NonNullable<typeof instance.check>>[1];
  const result = await instance.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/could not reach/.test(result.message!), result.message);
});

/** It answers 204 unauthenticated when healthy, so anything else is the host. */
Deno.test("instance: a 5xx is down and a 4xx is degraded, both blaming the instance", async () => {
  const serverError = mockCtx([{ status: 502, body: "" }], { display: connected });
  const down = await instance.check!({}, serverError.ctx);
  assertEquals(down.state, "down");
  assert(/the instance, not the credential/.test(down.message!), down.message);

  const clientError = mockCtx([{ status: 404, body: "" }], { display: connected });
  assertEquals((await instance.check!({}, clientError.ctx)).state, "degraded");
});

/** A repointed DNS entry, or a host that now serves something else. */
Deno.test("instance: the product changing under the connection is degraded", async () => {
  const { ctx } = mockCtx([pong("Terraform Enterprise", "2.6")], { display: connected });
  const result = await instance.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/pointing at a different instance/.test(result.message!), result.message);
});

/**
 * An endpoint that starts 404ing after a Terraform Enterprise upgrade says
 * nothing about versions in its error.
 */
Deno.test("instance: an API version drift is reported with both versions", async () => {
  const { ctx } = mockCtx([pong("HCP Terraform", "2.7")], { display: connected });
  const result = await instance.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/now on API version 2\.7, up from 2\.6/.test(result.message!), result.message);
  assert(/says nothing about versions/.test(result.message!), result.message);
});

Deno.test("instance: a connection that recorded nothing still reports up", async () => {
  const { ctx } = mockCtx([pong()], { display: {} });
  assertEquals((await instance.check!({}, ctx)).state, "ok");
});

Deno.test("instance: it is connection-scoped, unsigned and fatal", () => {
  assertEquals(instance.scope, "connection");
  assertEquals(instance.credential, "none");
  assertEquals(instance.severity, "fatal");
  assert(/UNAUTHENTICATED/.test(instance.description!), instance.description);
});
