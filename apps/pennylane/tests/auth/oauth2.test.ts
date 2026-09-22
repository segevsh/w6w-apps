import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

const ME = {
  user: {
    id: 12345,
    first_name: "John",
    last_name: "Doe",
    email: "jdoe@pennylane.com",
    locale: "fr",
  },
  company: { id: 123456, name: "Pennylane", reg_no: "123456789", accounting_logic: "french" },
  scopes: ["customers:all"],
};

Deno.test("oauth2: declares Pennylane's authorize/token endpoints and no PKCE", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://app.pennylane.com/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://app.pennylane.com/oauth/token");
  // The walkthrough documents the plain authorization-code grant and never
  // mentions PKCE — match that, as Asana's credential does.
  assertEquals(auth.oauth2?.pkce, false);
});

Deno.test("oauth2: requests exactly the union of the scopes the 22 actions need", () => {
  assertEquals(auth.oauth2?.scopes, [
    "customers:all",
    "suppliers:all",
    "products:all",
    "customer_invoices:all",
    "supplier_invoices:all",
    "journals:all",
    "ledger_accounts:all",
    "categories:all",
    "transactions:all",
  ]);
  // `:all` covers read, so no `:readonly` variant belongs in the request.
  for (const scope of auth.oauth2?.scopes ?? []) {
    assert(scope.endsWith(":all"), scope);
  }
});

Deno.test("oauth2: sign stamps the Bearer header from the stored access token", () => {
  const request = {
    url: "https://app.pennylane.com/api/external/v2/me",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = auth.sign!({ request, credential: { accessToken: "acc-123" } }, {} as never) as {
    headers: Record<string, string>;
  };
  assertEquals(out.headers["authorization"], "Bearer acc-123");
});

Deno.test("oauth2: test probes GET /me with the token and succeeds on 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: ME }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);

  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/me");
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});

Deno.test("oauth2: test reports the vendor's own error text from the body", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "unauthorized", message: "Access token is missing or invalid" },
  }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);

  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"), result.message);
  assert((result.message ?? "").includes("Access token is missing or invalid"), result.message);
});

Deno.test("oauth2: test falls back to the status when a 401 carries no body", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);

  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"), result.message);
});

Deno.test("oauth2: test with no accessToken fails without calling the API", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"), result.message);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: afterConnect labels the connection with the user and company", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: ME }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "x" } }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/me");
  assertEquals(out, {
    user: {
      id: 12345,
      name: "John Doe",
      firstName: "John",
      lastName: "Doe",
      email: "jdoe@pennylane.com",
      locale: "fr",
    },
    company: { id: 123456, name: "Pennylane", regNo: "123456789" },
  });
});

Deno.test("oauth2: afterConnect does not echo credential material", async () => {
  const { ctx } = mockCtx([{ status: 200, body: ME }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "super-secret" } }, ctx);
  assert(!JSON.stringify(out).includes("super-secret"));
});

Deno.test("oauth2: afterConnect degrades to {} when the probe fails or is unreadable", async () => {
  const failing = mockCtx([{ status: 503, body: undefined }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, failing.ctx), {});

  const unreadable = mockCtx([{ status: 200, body: "<html>" }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, unreadable.ctx), {});
});

Deno.test("oauth2: a null user does not break the label", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { user: null, company: { id: 1, name: "Acme" } },
  }]);
  const out = await auth.afterConnect!({ credential: {} }, ctx);
  assertEquals(out.user, {
    id: undefined,
    name: "",
    firstName: undefined,
    lastName: undefined,
    email: undefined,
    locale: undefined,
  });
  assertEquals(out.company, { id: 1, name: "Acme", regNo: undefined });
});
