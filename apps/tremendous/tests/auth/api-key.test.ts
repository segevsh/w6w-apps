import { assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api-key: sign injects the Authorization bearer header", async () => {
  const request = {
    url: "https://api.tremendous.com/api/v2/orders",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signed = await apiKey.sign!(
    { request, credential: { apiKey: "PROD_abc123" } },
    {} as never,
  );
  assertEquals(signed.headers.authorization, "Bearer PROD_abc123");
});

Deno.test("authHeaders: builds the exact wire format", () => {
  assertEquals(authHeaders({ apiKey: "PROD_xyz" }), { authorization: "Bearer PROD_xyz" });
});

Deno.test("api-key.test: reports ok when /organizations returns the account's org", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { organizations: [{ id: "ORG1", name: "Acme" }] },
  }]);
  const result = await apiKey.test({ credential: { apiKey: "PROD_abc123" } }, ctx);

  assertEquals(result.ok, true);
  assertEquals(calls[0].headers.authorization, "Bearer PROD_abc123");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/organizations");
});

Deno.test("api-key.test: distinguishes a missing key from an invalid one by message, not status", async () => {
  const { ctx: missingCtx } = mockCtx([{
    status: 401,
    body: {
      errors: {
        message: "We did not receive an API key with this request. You need to provide your " +
          "API key in the Authorization header, using Bearer auth.",
      },
    },
  }]);
  const missing = await apiKey.test({ credential: { apiKey: "" } }, missingCtx);
  assertEquals(missing.ok, false);
  assertEquals(missing.message, "credential missing apiKey");

  const { ctx: invalidCtx } = mockCtx([{
    status: 401,
    body: {
      errors: { message: "The API key you provided was invalid. You provided: garba********-xyz." },
    },
  }]);
  const invalid = await apiKey.test({ credential: { apiKey: "garbage-token-xyz" } }, invalidCtx);
  assertEquals(invalid.ok, false);
  assertEquals(invalid.message?.includes("invalid"), true);
});

Deno.test("api-key.test: a bare 401 with an unrecognised message still fails, mentioning IP restriction", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errors: { message: "Something else entirely" } },
  }]);
  const result = await apiKey.test({ credential: { apiKey: "PROD_abc123" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("source IP"), true);
});

Deno.test("api-key.test: no organizations in a 200 body is reported as not ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { organizations: [] } }]);
  const result = await apiKey.test({ credential: { apiKey: "PROD_abc123" } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("api-key.afterConnect: publishes the organization name", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { organizations: [{ id: "ORG1", name: "Acme Inc." }] },
  }]);
  const extra = await apiKey.afterConnect!({ credential: { apiKey: "PROD_abc123" } }, ctx);
  assertEquals(extra, { organizationName: "Acme Inc." });
});

Deno.test("api-key.afterConnect: swallows a failure rather than breaking a good connection", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const extra = await apiKey.afterConnect!({ credential: { apiKey: "PROD_abc123" } }, ctx);
  assertEquals(extra, {});
});
