import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Intuit's documented endpoints and the accounting scope", () => {
  assertEquals(auth.oauth2?.authorizationUrl, "https://appcenter.intuit.com/connect/oauth2");
  assertEquals(auth.oauth2?.tokenUrl, "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer");
  assertEquals(
    auth.oauth2?.revokeUrl,
    "https://developer.api.intuit.com/v2/oauth2/tokens/revoke",
  );
  assertEquals(auth.oauth2?.scopes, ["com.intuit.quickbooks.accounting"]);
});

Deno.test("oauth2: collects realmId as a required connect-time field", () => {
  const realmField = auth.fields?.find((f) => f.key === "realmId");
  assertEquals(realmField?.required, true);
});

Deno.test("sign: stamps Authorization only — realmId lives in the URL, not a header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://quickbooks.api.intuit.com/v3/company/123/customer/1",
    method: "GET",
    headers: {},
  };
  const signed = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(signed.headers["authorization"], "Bearer tok");
});

Deno.test("test: rejects a credential missing accessToken or realmId", async () => {
  const { ctx } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing accessToken or realmId",
  });
});

Deno.test("test: accepts a live credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { CompanyInfo: { CompanyName: "Acme" } } }]);
  assertEquals(
    await auth.test({ credential: { accessToken: "tok", realmId: "123" } }, ctx),
    { ok: true },
  );
  assertEquals(
    calls[0].url,
    "https://quickbooks.api.intuit.com/v3/company/123/companyinfo/123?minorversion=75",
  );
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("test: surfaces a non-ok CompanyInfo response", async () => {
  const { ctx } = mockCtx([{ status: 401 }]);
  assertEquals(
    await auth.test({ credential: { accessToken: "tok", realmId: "123" } }, ctx),
    { ok: false, message: "QuickBooks returned 401" },
  );
});

Deno.test("afterConnect: records the company name alongside the realmId", async () => {
  const { ctx, calls } = mockCtx([{
    body: { CompanyInfo: { CompanyName: "Acme Inc", LegalName: "Acme Incorporated" } },
  }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "tok", realmId: "123" } }, ctx);
  assertEquals(out, { realmId: "123", companyName: "Acme Inc", legalName: "Acme Incorporated" });
  assertEquals(
    calls[0].url,
    "https://quickbooks.api.intuit.com/v3/company/123/companyinfo/123?minorversion=75",
  );
});

Deno.test("afterConnect: degrades to just the realmId when the company lookup fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  assertEquals(
    await auth.afterConnect!({ credential: { accessToken: "tok", realmId: "123" } }, ctx),
    { realmId: "123" },
  );
});

Deno.test("afterConnect: returns {} when the credential carries no realmId", async () => {
  const { ctx } = mockCtx();
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx), {});
});
