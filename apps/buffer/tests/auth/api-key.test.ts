import { assert, assertEquals } from "@std/assert";
import { API, data, gqlError, gqlOf, mockCtx } from "../_helpers.ts";
import apiKey, { authHeaders } from "../../auth/api-key.ts";

Deno.test("auth: the wire format is a Bearer header, built in one place", () => {
  assertEquals(authHeaders({ apiKey: "k1" }), { Authorization: "Bearer k1" });
  // A missing key still produces a scheme word: Buffer answers a scheme-less
  // token with the same "Access token is not valid" as a wrong one, so a probe
  // that dropped the prefix would fail indistinguishably.
  assertEquals(authHeaders({}), { Authorization: "Bearer " });
});

Deno.test("auth: the declarative apiKey config matches what sign stamps", () => {
  assertEquals(apiKey.apiKey, { in: "header", name: "Authorization", prefix: "Bearer " });
  const request = { url: API, method: "POST", headers: {} as Record<string, string> };
  const { ctx } = mockCtx();
  const signed = apiKey.sign!(
    { request, credential: { apiKey: "k1" } },
    ctx,
  ) as typeof request;
  assertEquals(signed.headers["Authorization"], "Bearer k1");
});

Deno.test("auth: the credential field is typed secret and required", () => {
  const field = (apiKey.fields ?? []).find((f) => f.key === "apiKey");
  assert(field, "no apiKey field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("auth: test fails before any fetch when the key is missing", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert(/missing apiKey/.test(result.message ?? ""));
  assertEquals(calls.length, 0, "must not call Buffer without a credential");
});

Deno.test("auth: the probe is `{ account { id } }` and nothing more", async () => {
  const { ctx, calls } = mockCtx([data({ account: { id: "a1" } })]);
  await apiKey.test({ credential: { apiKey: "k1" } }, ctx);
  const { query } = gqlOf(calls[0]);
  assertEquals(calls[0].url, API);
  assert(/account\s*\{\s*id\s*\}/.test(query), query);
  // Chosen by reading the response body, not the name: Account also exposes
  // email, backupEmail and every OAuth client the user has authorised.
  assert(!/email/i.test(query), query);
  assert(!/connectedApps/.test(query), query);
});

Deno.test("auth: the probe stamps its own header rather than relying on sign", async () => {
  const { ctx, calls } = mockCtx([data({ account: { id: "a1" } })]);
  await apiKey.test({ credential: { apiKey: "k1" } }, ctx);
  assertEquals(calls[0].headers["authorization"], "Bearer k1");
});

Deno.test("auth: a valid key is ok", async () => {
  const { ctx } = mockCtx([data({ account: { id: "a1" } })]);
  assertEquals(await apiKey.test({ credential: { apiKey: "k1" } }, ctx), { ok: true });
});

Deno.test("auth: UNAUTHENTICATED — the code the live API actually returns", async () => {
  const { ctx } = mockCtx([gqlError("Access token is not valid", "UNAUTHENTICATED", 401)]);
  const result = await apiKey.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(/UNAUTHENTICATED/.test(result.message ?? ""), result.message);
  assert(/Settings → API/.test(result.message ?? ""), result.message);
});

Deno.test("auth: UNAUTHORIZED — the code the docs table publishes — reads the same", async () => {
  const { ctx } = mockCtx([gqlError("Not authorized", "UNAUTHORIZED")]);
  const result = await apiKey.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(/UNAUTHORIZED/.test(result.message ?? ""), result.message);
});

Deno.test("auth: FORBIDDEN is a permission story, not a credential one", async () => {
  const { ctx } = mockCtx([gqlError("Not permitted", "FORBIDDEN")]);
  const result = await apiKey.test({ credential: { apiKey: "k1" } }, ctx);
  assertEquals(result.ok, false);
  assert(/FORBIDDEN/.test(result.message ?? ""), result.message);
  assert(/missing scope/.test(result.message ?? ""), result.message);
  // Must NOT tell the user their key is wrong — different fix.
  assert(!/Settings → API/.test(result.message ?? ""), result.message);
});

Deno.test("auth: an HTTP 200 carrying errors still fails — res.ok is not the signal", async () => {
  const { ctx } = mockCtx([gqlError("Something broke", "UNEXPECTED", 200)]);
  const result = await apiKey.test({ credential: { apiKey: "k1" } }, ctx);
  assertEquals(result.ok, false);
  assert(/Something broke/.test(result.message ?? ""), result.message);
});

Deno.test("auth: no message ever echoes the credential", async () => {
  const { ctx } = mockCtx([gqlError("Access token is not valid", "UNAUTHENTICATED", 401)]);
  const result = await apiKey.test({ credential: { apiKey: "s3cr3t-key-value" } }, ctx);
  assert(!(result.message ?? "").includes("s3cr3t-key-value"), result.message);
});

Deno.test("afterConnect: labels the connection and hands back the organization ids", async () => {
  const { ctx, calls } = mockCtx([
    data({
      account: {
        id: "a1",
        name: "Ada Lovelace",
        organizations: [{ id: "o1", name: "Analytical Engines" }],
      },
    }),
  ]);
  const out = await apiKey.afterConnect!({ credential: { apiKey: "k1" } }, ctx);
  assertEquals(out, {
    account: {
      id: "a1",
      name: "Ada Lovelace",
      organizations: [{ id: "o1", name: "Analytical Engines" }],
    },
  });
  assert(!/email/i.test(gqlOf(calls[0]).query), "label query must not pull an email");
});

Deno.test("afterConnect: a null account name falls back to the organization, then the id", async () => {
  const { ctx } = mockCtx([
    data({ account: { id: "a1", name: null, organizations: [{ id: "o1", name: "Acme" }] } }),
  ]);
  const out = await apiKey.afterConnect!({ credential: { apiKey: "k1" } }, ctx) as {
    account: { name: string };
  };
  assertEquals(out.account.name, "Acme");

  const { ctx: ctx2 } = mockCtx([data({ account: { id: "a1", name: null, organizations: [] } })]);
  const out2 = await apiKey.afterConnect!({ credential: { apiKey: "k1" } }, ctx2) as {
    account: { name: string };
  };
  assertEquals(out2.account.name, "Buffer account a1");
});

Deno.test("afterConnect: a failure returns {} rather than blocking the connection", async () => {
  const { ctx } = mockCtx([gqlError("boom", "UNEXPECTED", 500)]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: "k1" } }, ctx), {});
});
