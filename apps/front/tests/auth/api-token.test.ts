import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: signs as a Bearer token — Front's scheme word matters", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api2.frontapp.com/conversations",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiToken: "eyJabc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer eyJabc");
  assertEquals(Object.keys(out.headers), ["authorization"]);
});

Deno.test("api-token: test reports the company on success", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "cmp_1", name: "Acme" } }]);
  const out = await auth.test!({ credential: { apiToken: "eyJabc" } }, ctx);
  assertEquals(out.ok, true);
  assert(out.message!.includes("Acme"), out.message);
  assertEquals(new URL(calls[0].url).pathname, "/me");
});

/**
 * The two 401s Front distinguishes, measured 2026-08-18. "Your token is wrong"
 * and "your token never arrived" have different fixes.
 */
Deno.test("api-token: a malformed or absent JWT is named as such", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { _error: { status: 401, title: "Unauthenticated", message: "JSON Web Token error" } },
  }]);
  const out = await auth.test!({ credential: { apiToken: "nope" } }, ctx);
  assertEquals(out.ok, false);
  assert(/never arrived|malformed/.test(out.message!), out.message);
});

Deno.test("api-token: an unknown or revoked token is named differently", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { _error: { status: 401, title: "Unauthenticated", message: "Invalid token" } },
  }]);
  const out = await auth.test!({ credential: { apiToken: "eyJabc" } }, ctx);
  assertEquals(out.ok, false);
  assert(/revoked|unknown/.test(out.message!), out.message);
});

Deno.test("api-token: a missing credential never reaches the network", async () => {
  const { ctx, calls } = mockCtx();
  const out = await auth.test!({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: afterConnect records the company, never the token", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "cmp_1", name: "Acme" } }]);
  const display = await auth.afterConnect!({ credential: { apiToken: "eyJabc" } }, ctx);
  assertEquals(display, { company: "Acme", companyId: "cmp_1" });
  assert(!JSON.stringify(display).includes("eyJabc"));
});

Deno.test("api-token: the token field is declared secret", () => {
  const f = auth.fields!.find((f) => f.key === "apiToken")!;
  assertEquals(f.type, "secret");
  assertEquals(f.required, true);
});
