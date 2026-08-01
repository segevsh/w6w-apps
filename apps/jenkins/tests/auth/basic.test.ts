import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { encodeBase64 } from "../../lib/client.ts";
import auth from "../../auth/basic.ts";

Deno.test("basic: declares endpoint / username / apiToken fields", () => {
  assertEquals(auth.key, "basic");
  assertEquals(auth.type, "basic");
  const keys = (auth.fields ?? []).map((f) => f.key);
  assert(keys.includes("endpoint"));
  assert(keys.includes("username"));
  assert(keys.includes("apiToken"));
  const token = auth.fields?.find((f) => f.key === "apiToken");
  assertEquals(token?.type, "secret");
  assertEquals(token?.required, true);
});

Deno.test("basic: sign injects a Basic Authorization header from username+apiToken", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { username: "alice", apiToken: "11aabbccddeeff" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], `Basic ${encodeBase64("alice:11aabbccddeeff")}`);
});

Deno.test("basic: test hits <endpoint>/api/json with Basic auth", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { jobs: [] } }]);
  const result = await auth.test(
    {
      credential: {
        endpoint: "https://ci.example.com",
        username: "alice",
        apiToken: "11aabbccddeeff",
      },
    },
    ctx,
  );
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://ci.example.com/api/json");
  assertEquals(
    calls[0].headers["authorization"],
    `Basic ${encodeBase64("alice:11aabbccddeeff")}`,
  );
});

Deno.test("basic: test reports failure without a network call when fields are missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { username: "alice" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("basic: test surfaces upstream status on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test(
    {
      credential: {
        endpoint: "https://ci.example.com",
        username: "alice",
        apiToken: "wrong",
      },
    },
    ctx,
  );
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("basic: afterConnect republishes endpoint and username onto the connection display", () => {
  const out = auth.afterConnect!(
    {
      credential: { endpoint: "https://ci.example.com", username: "alice", apiToken: "t" },
    },
    mockCtx().ctx,
  );
  assertEquals(out, { endpoint: "https://ci.example.com", username: "alice" });
});
