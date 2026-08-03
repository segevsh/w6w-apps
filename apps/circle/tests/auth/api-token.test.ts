import { assert, assertEquals } from "@std/assert";
import auth, { authHeaders } from "../../auth/api-token.ts";
import { API, mockCtx } from "../_helpers.ts";

Deno.test("auth: the wire format is `Authorization: Bearer <token>`", () => {
  // Verified on the wire 2026-08-03: a bare token with no scheme word is not
  // seen at all ("API token not found"), so the prefix is load-bearing.
  assertEquals(authHeaders({ apiToken: "tok_123" }), { Authorization: "Bearer tok_123" });
});

Deno.test("auth: a missing token still produces a well-formed header rather than `undefined`", () => {
  assertEquals(authHeaders({}), { Authorization: "Bearer " });
});

Deno.test("auth: the declared apiKey placement matches what sign actually sends", () => {
  assertEquals(auth.apiKey?.in, "header");
  assertEquals(auth.apiKey?.name, "Authorization");
  assertEquals(auth.apiKey?.prefix, "Bearer ");
});

Deno.test("auth: sign stamps the header onto the request and returns it", () => {
  const request = { url: `${API}/community`, method: "GET", headers: {} as Record<string, string> };
  const { ctx } = mockCtx();
  const signed = auth.sign!(
    { request, credential: { apiToken: "tok_123" } },
    ctx,
  ) as typeof request;
  assertEquals(signed.headers["Authorization"], "Bearer tok_123");
});

Deno.test("auth: the credential is a single masked field", () => {
  const fields = auth.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["apiToken"]);
  assertEquals(fields[0].type, "secret");
  assertEquals(fields[0].required, true);
});

Deno.test("auth: test probes GET /community with the bearer header", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Acme" } }]);
  assertEquals(await auth.test({ credential: { apiToken: "tok_123" } }, ctx), { ok: true });
  assertEquals(calls[0].url, `${API}/community`);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], "Bearer tok_123");
});

Deno.test("auth: a missing token fails before any request is made", async () => {
  const { ctx, calls } = mockCtx();
  const res = await auth.test({ credential: {} }, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth: 401 is reported as a bad token, and names the token-type trap", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { success: false, message: "The API token is invalid." } },
  ]);
  const res = await auth.test({ credential: { apiToken: "bad" } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("401"));
  assert(res.message!.includes("V2"));
});

Deno.test("auth: 403 is reported as a PLAN problem, not a credential problem", async () => {
  // These need different fixes. A generic "auth failed" sends an operator
  // hunting for a bad token when the token is fine and the plan is not.
  const { ctx } = mockCtx([
    {
      status: 403,
      body: { success: false, message: "The community is not eligible for admin API v2 access." },
    },
  ]);
  const res = await auth.test({ credential: { apiToken: "tok" } }, ctx);
  assertEquals(res.ok, false);
  assertEquals(res.message, "The community is not eligible for admin API v2 access.");
});

Deno.test("auth: any other non-2xx is reported as a Circle-side failure", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "" }]);
  const res = await auth.test({ credential: { apiToken: "tok" } }, ctx);
  assertEquals(res, { ok: false, message: "Circle returned HTTP 502" });
});

Deno.test("auth: afterConnect labels the connection with the community", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, name: "Acme HQ", slug: "acme-hq" } }]);
  const display = await auth.afterConnect!({ credential: { apiToken: "tok" } }, ctx);
  assertEquals(calls[0].url, `${API}/community`);
  assertEquals(display, { community: { id: 42, name: "Acme HQ", slug: "acme-hq" } });
});

Deno.test("auth: afterConnect never blocks a working connection over a missing label", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.afterConnect!({ credential: { apiToken: "tok" } }, ctx), {});

  const noToken = mockCtx();
  assertEquals(await auth.afterConnect!({ credential: {} }, noToken.ctx), {});
  assertEquals(noToken.calls.length, 0);
});

Deno.test("auth: connectionLabel references only what afterConnect publishes", () => {
  assertEquals(auth.connectionLabel, "{{community.name}}");
});
