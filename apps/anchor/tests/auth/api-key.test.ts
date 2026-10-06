import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const CRED = { apiKey: "anc-unit-test-fixture", userEmail: "dev@example.com" };

Deno.test("api-key: sign stamps the bearer and the acting-user email", () => {
  const request = {
    method: "GET",
    url: "https://api.sayanchor.com/me",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: CRED }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${CRED.apiKey}`);
  assertEquals(signed.headers["anchor-user-email"], CRED.userEmail);
  assertEquals(signed.url, "https://api.sayanchor.com/me");
});

Deno.test("api-key: authHeaders trims stray whitespace from a pasted key", () => {
  assertEquals(authHeaders({ apiKey: "  anc-x \n", userEmail: " a@b.co " }), {
    authorization: "Bearer anc-x",
    "anchor-user-email": "a@b.co",
  });
});

Deno.test("api-key: the probe is GET /me, which echoes no credential", async () => {
  assertEquals(PROBE_PATH, "/me");
  const { ctx, calls } = mockCtx([{ body: { businessId: "b1", businessName: "Acme" } }]);
  assertEquals(await apiKey.test({ credential: CRED }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/me");
  assertEquals(calls[0].headers["anchor-user-email"], CRED.userEmail);
});

Deno.test("api-key: test fails without a key or email, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await apiKey.test({ credential: { userEmail: "a@b.co" } }, ctx)).ok, false);
  assertEquals((await apiKey.test({ credential: { apiKey: "anc-x" } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: classifies INVALID_API_KEY from the body, not the status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { status: 401, error: "INVALID_API_KEY" } }]);
  const r = await apiKey.test({ credential: CRED }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("INVALID_API_KEY"));
  assert(r.message?.includes("rejected the API key"));
});

Deno.test("api-key: a text/plain 401 (no Authorization) is still a clean failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized" }]);
  const r = await apiKey.test({ credential: CRED }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("401 Unauthorized"));
});

Deno.test("api-key: 403 names the acting user", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: 403, error: "FORBIDDEN" } }]);
  const r = await apiKey.test({ credential: CRED }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes(CRED.userEmail));
});

Deno.test("api-key: an unexpected status is reported with the code", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { error: "boom" } }]);
  const r = await apiKey.test({ credential: CRED }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("500 boom"));
});

Deno.test("api-key: afterConnect publishes only the business name and id", async () => {
  const { ctx } = mockCtx([{ body: { businessId: "b1", businessName: "Acme", extra: "x" } }]);
  assertEquals(await apiKey.afterConnect!({ credential: CRED }, ctx), {
    businessName: "Acme",
    businessId: "b1",
  });
});

Deno.test("api-key: afterConnect swallows failures", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  assertEquals(await apiKey.afterConnect!({ credential: CRED }, ctx), {});
  assertEquals(await apiKey.afterConnect!({ credential: CRED }, mockCtx([]).ctx), {});
});
