import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/service-account-token.ts";

Deno.test("service-account-token: declares endpoint / token fields", () => {
  assertEquals(auth.key, "service-account-token");
  assertEquals(auth.type, "apiKey");
  const keys = (auth.fields ?? []).map((f) => f.key);
  assert(keys.includes("endpoint"));
  assert(keys.includes("token"));
  const secret = auth.fields?.find((f) => f.key === "token");
  assertEquals(secret?.type, "secret");
  assertEquals(secret?.required, true);
});

Deno.test("service-account-token: sign injects a Bearer Authorization header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { token: "glsa_abc123" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer glsa_abc123");
});

Deno.test("service-account-token: test hits <endpoint>/api/org with the Bearer header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, name: "Main Org." } }]);
  const result = await auth.test(
    { credential: { endpoint: "https://example.grafana.net", token: "glsa_abc123" } },
    ctx,
  );
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://example.grafana.net/api/org");
  assertEquals(calls[0].headers["authorization"], "Bearer glsa_abc123");
});

Deno.test("service-account-token: test reports failure without a network call when fields are missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { endpoint: "https://example.grafana.net" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("service-account-token: test surfaces upstream status on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test(
    { credential: { endpoint: "https://example.grafana.net", token: "bad-token" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("service-account-token: afterConnect republishes endpoint onto the connection display", () => {
  const out = auth.afterConnect!(
    { credential: { endpoint: "https://example.grafana.net", token: "glsa_abc123" } },
    mockCtx().ctx,
  );
  assertEquals(out, { endpoint: "https://example.grafana.net" });
});
