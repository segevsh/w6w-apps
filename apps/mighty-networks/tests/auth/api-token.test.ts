import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-token.ts";
import { API, mockCtx, NET } from "../_helpers.ts";

const CRED = { networkId: NET, apiToken: "tok_secret_123" };

Deno.test("auth: sign stamps Authorization: Bearer <token> and returns the request", () => {
  const request = {
    url: `${API}/networks/${NET}/me`,
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const { ctx } = mockCtx();
  const signed = auth.sign!({ request, credential: CRED }, ctx) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer tok_secret_123");
});

Deno.test("auth: the Network ID is a plain field, the token a secret", () => {
  const byKey = Object.fromEntries((auth.fields ?? []).map((f) => [f.key, f]));
  assertEquals(byKey.networkId.type, "string");
  assertEquals(byKey.networkId.required, true);
  assertEquals(byKey.apiToken.type, "secret");
  assertEquals(auth.connectionLabel, "Mighty Networks ({{networkId}})");
  const pattern = new RegExp(byKey.networkId.validation!.pattern!);
  assert(pattern.test("12345") && pattern.test("my-network"));
  assert(!pattern.test("../x") && !pattern.test("Upper") && !pattern.test("a b"));
});

Deno.test("auth: test probes GET /networks/{id}/me with the bearer header", async () => {
  const { ctx, calls } = mockCtx([{ body: { user: { id: 1 }, network: { id: 12345 } } }]);
  assertEquals(await auth.test({ credential: CRED }, ctx), { ok: true });
  assertEquals(calls[0].url, `${API}/networks/${NET}/me`);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], "Bearer tok_secret_123");
});

Deno.test("auth: the quick start's flat me payload also passes", async () => {
  const { ctx } = mockCtx([{ body: { id: "12345", name: "John Doe" } }]);
  assertEquals(await auth.test({ credential: CRED }, ctx), { ok: true });
});

Deno.test("auth: test never reports the token back", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "unauthorized", message: "Invalid API token" },
  }]);
  const r = await auth.test({ credential: CRED }, ctx);
  assertEquals(r.ok, false);
  assert(!JSON.stringify(r).includes("tok_secret_123"));
});

Deno.test("auth: 401 surfaces the vendor's own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Missing or malformed Authorization header" },
  }]);
  const r = await auth.test({ credential: CRED }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("rejected the token"));
  assert(r.message!.includes("Missing or malformed Authorization header"));
});

Deno.test("auth: 403 points at permissions and plan, not the token", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "forbidden" } }]);
  const r = await auth.test({ credential: CRED }, ctx);
  assertEquals(r.ok, false);
  assert(/plan/i.test(r.message!) && !/rejected the token/.test(r.message!));
});

Deno.test("auth: 404 means the Network was not found", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "not_found" } }]);
  const r = await auth.test({ credential: CRED }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes(`Network "${NET}" was not found`));
});

Deno.test("auth: a 200 that is not the me payload is not a pass", async () => {
  for (const body of ["<html>shell</html>", { error: "nope" }, { something: 1 }, []]) {
    const { ctx } = mockCtx([{ body }]);
    const r = await auth.test({ credential: CRED }, ctx);
    assertEquals(r.ok, false, JSON.stringify(body));
  }
});

Deno.test("auth: a 5xx is reported with its status", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "Bad gateway" }]);
  const r = await auth.test({ credential: CRED }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("502"));
});

Deno.test("auth: missing or malformed credential fields fail before any request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test({ credential: { apiToken: "x" } }, ctx)).ok, false);
  assertEquals((await auth.test({ credential: { networkId: NET } }, ctx)).ok, false);
  const bad = await auth.test({ credential: { networkId: "../x", apiToken: "x" } }, ctx);
  assertEquals(bad.ok, false);
  assertEquals(calls.length, 0);
});
