import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/server-info-get.ts";

const D = { display: { host: "https://gerrit.example.com" } };
const PREFIX = ")]}'\n";
const version = { status: 200, body: PREFIX + '"3.14.2-622-ge70cefe8a2"' };
const info = (extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: PREFIX + JSON.stringify({
    auth: { auth_type: "LDAP", use_contributor_agreements: true },
    accounts: { visibility: "ALL" },
    change: { large_change: 500 },
    ...extra,
  }),
});

/** The version endpoint returns a bare JSON string, not an object. */
Deno.test("server-info-get: reads the version as a string", async () => {
  const { ctx, calls } = mockCtx([version, info()], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/a/config/server/version");
  assertEquals(result.version, "3.14.2-622-ge70cefe8a2");
  assertEquals(result.majorVersion, 3);
});

Deno.test("server-info-get: reports the auth type and the CLA requirement", async () => {
  const { ctx } = mockCtx([version, info()], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.authType, "LDAP");
  assertEquals(result.requiresContributorAgreement, true);
});

/** A development Gerrit lets anybody become anybody. */
Deno.test("server-info-get: warns about DEVELOPMENT_BECOME_ANY_ACCOUNT", async () => {
  const { ctx, logs } = mockCtx([
    version,
    info({ auth: { auth_type: "DEVELOPMENT_BECOME_ANY_ACCOUNT" } }),
  ], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.isDevelopmentAuth, true);
  assert(
    logs.some((l) => l.level === "warn" && /act as anybody/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** Restricted visibility makes account searches silently incomplete. */
Deno.test("server-info-get: notes restricted account visibility", async () => {
  const { ctx, logs } = mockCtx([
    version,
    info({ accounts: { visibility: "VISIBLE_GROUP" } }),
  ], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.accountVisibility, "VISIBLE_GROUP");
  assert(
    logs.some((l) => /without an error/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("server-info-get: an ordinary instance warns about nothing", async () => {
  const { ctx, logs } = mockCtx([version, info()], D);
  await action.execute({}, ctx);
  assertEquals(logs.length, 0);
});
