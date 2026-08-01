import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { encodeBase64 } from "../../lib/client.ts";
import auth from "../../auth/basic.ts";

Deno.test("basic: declares endpoint / username / password fields", () => {
  assertEquals(auth.key, "basic");
  assertEquals(auth.type, "basic");
  const keys = (auth.fields ?? []).map((f) => f.key);
  assert(keys.includes("endpoint"));
  assert(keys.includes("username"));
  assert(keys.includes("password"));
  const pw = auth.fields?.find((f) => f.key === "password");
  assertEquals(pw?.type, "secret");
  assertEquals(pw?.required, true);
});

Deno.test("basic: sign injects a Basic Authorization header from username+password", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { username: "elastic", password: "changeme" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], `Basic ${encodeBase64("elastic:changeme")}`);
});

Deno.test("basic: test hits <endpoint>/_security/_authenticate with Basic auth", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { username: "elastic" } }]);
  const result = await auth.test(
    {
      credential: {
        endpoint: "https://example.com:9200",
        username: "elastic",
        password: "changeme",
      },
    },
    ctx,
  );
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://example.com:9200/_security/_authenticate");
  assertEquals(calls[0].headers["authorization"], `Basic ${encodeBase64("elastic:changeme")}`);
});

Deno.test("basic: test reports failure without a network call when fields are missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { username: "elastic" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("basic: test surfaces upstream status on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test(
    {
      credential: {
        endpoint: "https://example.com:9200",
        username: "elastic",
        password: "wrong",
      },
    },
    ctx,
  );
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("basic: afterConnect republishes endpoint and username onto the connection display", () => {
  const out = auth.afterConnect!(
    { credential: { endpoint: "https://example.com:9200", username: "elastic", password: "p" } },
    mockCtx().ctx,
  );
  assertEquals(out, { endpoint: "https://example.com:9200", username: "elastic" });
});
