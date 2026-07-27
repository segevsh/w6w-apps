import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

Deno.test("access-token: is a bearer method exposing an `accessToken` secret field", () => {
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "accessToken");
  assert(field, "must declare an `accessToken` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("access-token: sign appends Bearer using credential.accessToken", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok_abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok_abc");
});

Deno.test("access-token: test hits /me with the version header and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { type: "admin", id: "1" } }]);
  const result = await auth.test({ credential: { accessToken: "tok_abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.intercom.io");
  assertEquals(url.pathname, "/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tok_abc");
  assertEquals(calls[0].headers["intercom-version"], "2.11");
});

Deno.test("access-token: test reports failure with status code when API rejects", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { type: "error.list" } }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});
