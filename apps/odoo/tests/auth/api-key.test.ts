import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import type { HookContext, SignableRequest } from "@w6w/types";
import auth, { signExecuteKw } from "../../auth/api-key.ts";
import {
  buildCommonBody,
  buildExecuteKwBody,
  SIGNED_ARG_COUNT,
  UNSIGNED_ARG_COUNT,
} from "../../lib/client.ts";
import {
  credential,
  mockCtx,
  TEST_API_KEY,
  TEST_DATABASE,
  TEST_INSTANCE,
  TEST_LOGIN,
  TEST_UID,
} from "../_helpers.ts";

const signable = (body: string): SignableRequest => ({
  url: `${TEST_INSTANCE}/jsonrpc`,
  method: "POST",
  headers: {},
  body,
});

Deno.test("api-key: declares a custom auth method with the four connect fields", () => {
  assertEquals(auth.key, "api-key");
  // `custom` is the accurate type: the credential goes into a positional slot of
  // a nested JSON array, which no declarative apiKey/bearer config can express.
  assertEquals(auth.type, "custom");
  assertEquals((auth.fields ?? []).map((f) => f.key), [
    "instanceUrl",
    "database",
    "username",
    "apiKey",
  ]);
});

Deno.test("api-key: only the API key field is secret, and it is required", () => {
  const fields = auth.fields ?? [];
  const key = fields.find((f) => f.key === "apiKey")!;
  assertEquals(key.type, "secret");
  assertEquals(key.required, true);
  // The instance URL, database and login are identifiers, not secrets — they are
  // republished as connection display metadata.
  for (const k of ["instanceUrl", "database", "username"]) {
    assertEquals(fields.find((f) => f.key === k)!.type, "string");
  }
  for (const f of fields) assertEquals(f.required, true, `${f.key} should be required`);
});

// --- THE argument ordering, which is where this API silently fails -----------

Deno.test("sign: unshifts [db, uid, apiKey] in exactly that order", () => {
  const body = buildExecuteKwBody("res.partner", "search_read", [], { limit: 5 });
  const signed = JSON.parse(signExecuteKw(body, credential() as never));

  assertEquals(signed.params.args, [
    TEST_DATABASE, // 0 — database
    TEST_UID, // 1 — uid, resolved at connect time
    TEST_API_KEY, // 2 — the credential
    "res.partner", // 3 — model
    "search_read", // 4 — method
    [], // 5 — positional args
    { limit: 5 }, // 6 — keyword args
  ]);
  assertEquals(signed.params.args.length, SIGNED_ARG_COUNT);
});

Deno.test("sign: preserves the model call's own args and kwargs untouched", () => {
  // A write is the shape most sensitive to a shifted index: [ids, vals].
  const body = buildExecuteKwBody("res.partner", "write", [[42], { name: "New" }], {
    context: { lang: "en_US" },
  });
  const signed = JSON.parse(signExecuteKw(body, credential() as never));

  assertEquals(signed.params.args[3], "res.partner");
  assertEquals(signed.params.args[4], "write");
  assertEquals(signed.params.args[5], [[42], { name: "New" }]);
  assertEquals(signed.params.args[6], { context: { lang: "en_US" } });
});

Deno.test("sign: keeps the JSON-RPC envelope's own shape", () => {
  const signed = JSON.parse(
    signExecuteKw(buildExecuteKwBody("res.users", "search_read"), credential() as never),
  );
  assertEquals(signed.jsonrpc, "2.0");
  assertEquals(signed.method, "call");
  assertEquals(signed.params.service, "object");
  assertEquals(signed.params.method, "execute_kw");
});

Deno.test("sign: is idempotent — signing an already-signed body changes nothing", () => {
  const once = signExecuteKw(
    buildExecuteKwBody("res.partner", "read", [[1]]),
    credential() as never,
  );
  const twice = signExecuteKw(once, credential() as never);
  assertEquals(JSON.parse(twice).params.args.length, SIGNED_ARG_COUNT);
  assertEquals(twice, once);
});

Deno.test("sign: throws on an execute_kw envelope with an unexpected arg count", () => {
  // Neither 4 nor 7 can only mean the client and the hook have drifted apart.
  const malformed = JSON.stringify({
    jsonrpc: "2.0",
    method: "call",
    params: { service: "object", method: "execute_kw", args: ["res.partner", "read"] },
    id: 1,
  });
  assertThrows(
    () => signExecuteKw(malformed, credential() as never),
    Error,
    `expected ${UNSIGNED_ARG_COUNT} unsigned execute_kw args`,
  );
});

Deno.test("sign: throws rather than sending a call with no uid", () => {
  assertThrows(
    () =>
      signExecuteKw(
        buildExecuteKwBody("res.partner", "read", [[1]]),
        credential({ uid: undefined }) as never,
      ),
    Error,
    "carries no uid",
  );
});

Deno.test("sign: leaves a non-execute_kw body alone", () => {
  // An unauthenticated `common` call must survive being routed through signing.
  const body = buildCommonBody("version", []);
  assertEquals(signExecuteKw(body, credential() as never), body);
});

Deno.test("sign: leaves a non-JSON body alone", () => {
  assertEquals(signExecuteKw("not json at all", credential() as never), "not json at all");
});

Deno.test("sign: sets the X-Odoo-Database header, which Odoo Online requires", () => {
  const request = signable(buildExecuteKwBody("res.partner", "search_read"));
  const signed = auth.sign!(
    { request, credential: credential() },
    {} as HookContext,
  ) as SignableRequest;
  assertEquals(signed.headers["x-odoo-database"], TEST_DATABASE);
});

Deno.test("sign: the hook rewrites the body through the same code path", () => {
  const request = signable(buildExecuteKwBody("crm.lead", "search_read", [], {}));
  const signed = auth.sign!(
    { request, credential: credential() },
    {} as HookContext,
  ) as SignableRequest;
  const args = JSON.parse(signed.body!).params.args;
  assertEquals(args.slice(0, 3), [TEST_DATABASE, TEST_UID, TEST_API_KEY]);
  assertEquals(args[3], "crm.lead");
});

Deno.test("sign: never puts the credential in a header", () => {
  const request = signable(buildExecuteKwBody("res.partner", "search_read"));
  const signed = auth.sign!(
    { request, credential: credential() },
    {} as HookContext,
  ) as SignableRequest;
  // Odoo authenticates the call, not the request — there is no Authorization
  // header to set, and inventing one would be misleading.
  assertEquals(signed.headers["authorization"], undefined);
  for (const value of Object.values(signed.headers)) {
    assert(!value.includes(TEST_API_KEY), "API key leaked into a header");
  }
});

// --- exchange ---------------------------------------------------------------

Deno.test("exchange: resolves the uid via common.authenticate and stores it", async () => {
  const { ctx, calls } = mockCtx([
    { result: TEST_UID }, // authenticate
    { result: { server_version: "saas~19.3+e" } }, // version, for the label
  ]);

  const cred = await auth.exchange!({
    fields: {
      instanceUrl: "acme.odoo.com",
      database: TEST_DATABASE,
      username: TEST_LOGIN,
      apiKey: TEST_API_KEY,
    },
  }, ctx) as Record<string, unknown>;

  // authenticate(db, login, password, {}) — the ordering that matters here too.
  const params = JSON.parse(calls[0].body!).params;
  assertEquals(params.service, "common");
  assertEquals(params.method, "authenticate");
  assertEquals(params.args, [TEST_DATABASE, TEST_LOGIN, TEST_API_KEY, {}]);

  assertEquals(cred.uid, TEST_UID);
  // A bare host is normalised to an https origin.
  assertEquals(cred.instanceUrl, TEST_INSTANCE);
  assertEquals(cred.serverVersion, "saas~19.3+e");
  assertEquals(cred.apiKey, TEST_API_KEY);
});

Deno.test("exchange: rejects credentials Odoo refuses, with an actionable message", async () => {
  // Odoo returns `false` rather than raising for a bad login/password.
  const { ctx } = mockCtx([{ result: false }]);
  const err = await assertRejects(() =>
    auth.exchange!({
      fields: {
        instanceUrl: TEST_INSTANCE,
        database: TEST_DATABASE,
        username: TEST_LOGIN,
        apiKey: "wrong",
      },
    }, ctx) as Promise<unknown>
  );
  assert(/rejected these credentials/i.test((err as Error).message));
  // The Odoo Online no-local-password trap is the most common cause.
  assert(/API key/i.test((err as Error).message));
});

Deno.test("exchange: still succeeds when the version lookup fails", async () => {
  // The version is cosmetic — a Connection with no version label is fine.
  const { ctx } = mockCtx([
    { result: TEST_UID },
    { error: { message: "nope" } },
  ]);
  const cred = await auth.exchange!({
    fields: {
      instanceUrl: TEST_INSTANCE,
      database: TEST_DATABASE,
      username: TEST_LOGIN,
      apiKey: TEST_API_KEY,
    },
  }, ctx) as Record<string, unknown>;
  assertEquals(cred.uid, TEST_UID);
  assertEquals(cred.serverVersion, undefined);
});

Deno.test("exchange: requires every field before making a network call", async () => {
  for (const missing of ["instanceUrl", "database", "username", "apiKey"]) {
    const fields: Record<string, string> = {
      instanceUrl: TEST_INSTANCE,
      database: TEST_DATABASE,
      username: TEST_LOGIN,
      apiKey: TEST_API_KEY,
    };
    delete fields[missing];
    // No queued responses: a network call would throw a different error.
    const { ctx, calls } = mockCtx([]);
    await assertRejects(() => auth.exchange!({ fields }, ctx) as Promise<unknown>);
    assertEquals(calls.length, 0, `${missing}: should fail before any request`);
  }
});

// --- test -------------------------------------------------------------------

Deno.test("test: reports ok for a live credential", async () => {
  const { ctx, calls } = mockCtx([{ result: TEST_UID }]);
  assertEquals(await auth.test!({ credential: credential() }, ctx), { ok: true });
  // Probes the unauthenticated `common` service — no permission required.
  assertEquals(JSON.parse(calls[0].body!).params.service, "common");
});

Deno.test("test: reports not-ok when Odoo refuses the credential", async () => {
  const { ctx } = mockCtx([{ result: false }]);
  const result = await auth.test!({ credential: credential() }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("test: reports not-ok, never throws, when the instance errors", async () => {
  const { ctx } = mockCtx([{ error: { data: { name: "odoo.exceptions.AccessDenied" } } }]);
  const result = await auth.test!({ credential: credential() }, ctx);
  assertEquals(result.ok, false);
  assert(/AccessDenied/.test(result.message ?? ""));
});

Deno.test("test: reports not-ok for an incomplete credential without calling out", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test!({ credential: { instanceUrl: TEST_INSTANCE } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

// --- afterConnect -----------------------------------------------------------

Deno.test("afterConnect: publishes identifiers and NEVER the API key", async () => {
  const display = await auth.afterConnect!({ credential: credential() }, {} as HookContext);
  assertEquals(display, {
    instanceUrl: TEST_INSTANCE,
    database: TEST_DATABASE,
    username: TEST_LOGIN,
    uid: TEST_UID,
    serverVersion: undefined,
  });
  // The one thing that must never appear here.
  assert(!JSON.stringify(display).includes(TEST_API_KEY), "API key leaked into display metadata");
  assertEquals("apiKey" in display, false);
});

Deno.test("afterConnect: the connection label uses only published fields", () => {
  const label = auth.connectionLabel ?? "";
  for (const token of label.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) {
    assert(
      ["username", "database", "instanceUrl", "uid", "serverVersion"].includes(token[1]),
      `connectionLabel references ${token[1]}, which afterConnect does not publish`,
    );
  }
});
