import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/events-token.ts";
import { EVENTS_HOSTS } from "../../lib/client.ts";

const cred = { region: "global", token: "ev-token" };

Deno.test("events-token: signs as a bearer", () => {
  const request = { url: EVENTS_HOSTS.global, headers: {} as Record<string, string> };
  const signed = auth.sign!(
    { request, credential: cred } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer ev-token");
});

/** Introspection reports the token's own scope, which is what somebody needs. */
Deno.test("events-token: the test reports what the token is granted", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { Features: ["signinattempts", "itemusages"], UUID: "u1" },
  }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].url, `${EVENTS_HOSTS.global}/api/auth/introspect`);
  assertEquals(result.ok, true);
  assert(/signinattempts, itemusages/.test(result.message!), result.message);
});

/** A token granted nothing authenticates and then 403s everywhere. */
Deno.test("events-token: a token with no grants connects but is called out", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { Features: [] } }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, true);
  assert(/every endpoint will 403/.test(result.message!), result.message);
});

Deno.test("events-token: each region reaches its own host", async () => {
  for (const [region, host] of Object.entries(EVENTS_HOSTS)) {
    const { ctx, calls } = mockCtx([{ status: 200, body: { Features: ["auditevents"] } }]);
    await auth.test!({ credential: { region, token: "t" } } as never, ctx);
    assertEquals(calls[0].url, `${host}/api/auth/introspect`);
  }
});

/** The wrong region fails exactly like a bad token. */
Deno.test("events-token: a failure suggests the other regions by name", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { Error: { Message: "Unauthorized" } } }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/try another region/.test(result.message!), result.message);
  assert(/eu, ca, enterprise/.test(result.message!), result.message);
});

Deno.test("events-token: an unknown region and a missing token fail before any request", async () => {
  const badRegion = mockCtx([]);
  const region = await auth.test!({
    credential: { region: "apac", token: "t" },
  } as never, badRegion.ctx);
  assertEquals(region.ok, false);
  assertEquals(badRegion.calls.length, 0);

  const noToken = mockCtx([]);
  assertEquals(
    (await auth.test!({ credential: { region: "global" } } as never, noToken.ctx)).ok,
    false,
  );
  assertEquals(noToken.calls.length, 0);
});

Deno.test("events-token: an unreachable host fails cleanly", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  assertEquals((await auth.test!({ credential: cred } as never, ctx)).ok, false);
});

/** The grants at connect time are what the `surface` check compares against. */
Deno.test("events-token: afterConnect records the surface, region and grants", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { Features: ["auditevents"] } }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(display.surface, "events");
  assertEquals(display.region, "global");
  assertEquals(display.features, ["auditevents"]);
});

Deno.test("events-token: afterConnect still records the surface when the call fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(display.surface, "events");
});

/** It reads the audit trail and no secrets — which is the point of separating it. */
Deno.test("events-token: says what it can and cannot do", () => {
  assert(/can read no secrets and write nothing/.test(auth.description!), auth.description);
  const token = auth.fields!.find((f) => f.key === "token")!;
  assert(/separately/.test(token.hint!), token.hint);
});
