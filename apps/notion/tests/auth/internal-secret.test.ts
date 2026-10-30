import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/internal-secret.ts";
import { NOTION_VERSION } from "../../lib/client.ts";

test("internal-secret: is a bearer method exposing a required `apiKey` secret field", () => {
  assertEquals(auth.key, "internal-secret");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

test("internal-secret: sign appends Bearer and Notion-Version", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "secret-xyz" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer secret-xyz");
  assertEquals(out.headers["Notion-Version"], NOTION_VERSION);
});

test("internal-secret: test hits /users/me and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { object: "user" } }]);
  const result = await auth.test({ credential: { apiKey: "secret-xyz" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/v1/users/me");
  assertEquals(calls[0].headers["authorization"], "Bearer secret-xyz");
  assertEquals(calls[0].headers["notion-version"], NOTION_VERSION);
});

test("internal-secret: test reports failure with missing credential", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});
