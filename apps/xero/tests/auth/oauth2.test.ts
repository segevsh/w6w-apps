import { assert, assertEquals } from "@std/assert";
import { mockCtx, mockXeroCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: asks for offline_access so scheduled runs keep working", () => {
  assertEquals(auth.oauth2?.authorizationUrl, "https://login.xero.com/identity/connect/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://identity.xero.com/connect/token");
  assertEquals(auth.oauth2?.revokeUrl, "https://identity.xero.com/connect/revocation");
  assert(auth.oauth2?.scopes?.includes("offline_access"));
  // Granular per-resource scopes, not the deprecated `accounting.transactions` catch-all.
  assert(auth.oauth2?.scopes?.includes("accounting.contacts"));
  assert(auth.oauth2?.scopes?.includes("accounting.invoices"));
  assert(auth.oauth2?.scopes?.includes("accounting.banktransactions"));
  assert(auth.oauth2?.scopes?.includes("accounting.settings"));
});

Deno.test("sign: stamps Authorization and Xero-tenant-id from the connection's display", async () => {
  const { ctx } = mockXeroCtx([], { tenantId: "tenant-1" });
  const request = { url: "https://api.xero.com/api.xro/2.0/Contacts", method: "GET", headers: {} };
  const signed = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(signed.headers["authorization"], "Bearer tok");
  assertEquals(signed.headers["xero-tenant-id"], "tenant-1");
});

Deno.test("sign: omits the tenant header when the connection has none yet", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://api.xero.com/connections", method: "GET", headers: {} };
  const signed = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(signed.headers["authorization"], "Bearer tok");
  assertEquals("xero-tenant-id" in signed.headers, false);
});

Deno.test("oauth2: test rejects a token that reaches no Xero organisation", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  assertEquals(await auth.test({ credential: { accessToken: "tok" } }, ctx), {
    ok: false,
    message: "the token grants access to no Xero organisation",
  });
  assertEquals(calls[0].url, "https://api.xero.com/connections");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test accepts a token with at least one accessible organisation", async () => {
  const { ctx } = mockCtx([{ body: [{ tenantId: "t1", tenantName: "Acme" }] }]);
  assertEquals(await auth.test({ credential: { accessToken: "tok" } }, ctx), { ok: true });
});

Deno.test("oauth2: afterConnect resolves the FIRST tenant the client needs", async () => {
  const { ctx, calls } = mockCtx([{
    body: [
      { tenantId: "t1", tenantName: "Acme Ltd", tenantType: "ORGANISATION" },
      { tenantId: "t2", tenantName: "Acme Holdings", tenantType: "ORGANISATION" },
    ],
  }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.tenantId, "t1");
  assertEquals(out.tenantName, "Acme Ltd");
  assertEquals(out.tenantType, "ORGANISATION");
  assertEquals(out.tenants, [
    { id: "t1", name: "Acme Ltd", type: "ORGANISATION" },
    { id: "t2", name: "Acme Holdings", type: "ORGANISATION" },
  ]);
  assertEquals(calls[0].url, "https://api.xero.com/connections");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: afterConnect degrades to {} when no organisation is accessible", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx), {});
});
