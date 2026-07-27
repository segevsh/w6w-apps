import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: is a bearer method exposing an `apiToken` secret field", () => {
  assertEquals(auth.key, "api-token");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiToken");
  assert(field, "must declare an `apiToken` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-token: sign appends Bearer using credential.apiToken", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiToken: "tok-abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok-abc");
});

Deno.test("api-token: test hits /projects and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  const result = await auth.test({ credential: { apiToken: "tok-abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.todoist.com");
  assertEquals(url.pathname, "/rest/v2/projects");
  assertEquals(calls[0].headers["authorization"], "Bearer tok-abc");
});

Deno.test("api-token: test reports failure with status code when API rejects", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Unauthorized" } }]);
  const result = await auth.test({ credential: { apiToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});
