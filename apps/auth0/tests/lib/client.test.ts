import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  Auth0Client,
  describeError,
  managementAudience,
  normalizeDomain,
  USER_SEARCH_CAP,
} from "../../lib/client.ts";

const conn = { display: { domain: "acme.us.auth0.com", tenant: "acme" } };

Deno.test("client: the tenant domain is the API host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], conn);
  await new Auth0Client(ctx).request("/users");
  assertEquals(new URL(calls[0].url).host, "acme.us.auth0.com");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/users");
});

Deno.test("client: a connection with no domain fails with a fixable message", () => {
  const { ctx } = mockCtx([], { display: {} });
  assertThrows(() => new Auth0Client(ctx), Error, "domain");
});

/** A custom domain fronts the Authentication API, not this one. */
Deno.test("normalizeDomain: accepts Auth0 domains and explains the refusal otherwise", () => {
  assertEquals(normalizeDomain("acme.us.auth0.com"), "acme.us.auth0.com");
  assertEquals(normalizeDomain("https://acme.eu.auth0.com/"), "acme.eu.auth0.com");
  assertThrows(() => normalizeDomain("auth.acme.com"), Error, "custom domain");
  assertThrows(() => normalizeDomain(""), Error, "no Auth0 domain");
});

/** A token without this audience is for the wrong API entirely. */
Deno.test("managementAudience: is derived from the domain, with the trailing slash", () => {
  assertEquals(managementAudience("acme.us.auth0.com"), "https://acme.us.auth0.com/api/v2/");
});

Deno.test("client: paging asks for totals so the caller can see the ceiling", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { users: [{ user_id: "a" }], total: 1, start: 0, limit: 50 },
  }], conn);
  const { items, total } = await new Auth0Client(ctx).requestAll("/users", "users", {}, 50);
  assertEquals(items.length, 1);
  assertEquals(total, 1);
  assertEquals(new URL(calls[0].url).searchParams.get("include_totals"), "true");
});

Deno.test("client: paging also copes with a bare array response", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ id: "a" }] }], conn);
  const { items } = await new Auth0Client(ctx).requestAll("/roles", "roles", {}, 50);
  assertEquals(items.length, 1);
});

Deno.test("client: a 403 blames the missing scope, not the credential", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { statusCode: 403, error: "Forbidden", message: "Insufficient scope" },
  }], conn);
  const err = await assertRejects(async () => await new Auth0Client(ctx).request("/users"));
  assert(/missing the scope/.test(String(err)), String(err));
  assert(/dashboard/.test(String(err)), String(err));
});

Deno.test("client: a 401 points at the refresh rather than the credential", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Expired token" } }], conn);
  const err = await assertRejects(async () => await new Auth0Client(ctx).request("/users"));
  assert(/refreshed/.test(String(err)), String(err));
});

Deno.test("describeError: a validation failure keeps Auth0's errorCode", () => {
  const message = describeError(
    400,
    JSON.stringify({ message: "Payload validation error", errorCode: "invalid_body" }),
  );
  assert(message.includes("invalid_body"), message);
});

Deno.test("the documented search ceiling is what the app enforces", () => {
  assertEquals(USER_SEARCH_CAP, 1000);
});
