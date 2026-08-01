import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/basic.ts";

Deno.test("basic: is a basic method exposing userId and apiKey fields", () => {
  assertEquals(auth.key, "basic");
  assertEquals(auth.type, "basic");
  const userId = auth.fields?.find((f) => f.key === "userId");
  const apiKey = auth.fields?.find((f) => f.key === "apiKey");
  assert(userId, "must declare a `userId` field");
  assert(apiKey, "must declare an `apiKey` field");
  assertEquals(userId.required, true);
  assertEquals(apiKey.type, "secret");
  assertEquals(apiKey.required, true);
});

Deno.test("basic: sign sets Basic base64(userId:apiKey)", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { userId: "12345", apiKey: "abc-key" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], `Basic ${btoa("12345:abc-key")}`);
});

Deno.test("basic: test hits /me and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { name: "Acme", email: "a@acme.com" } }]);
  const result = await auth.test({ credential: { userId: "12345", apiKey: "abc-key" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://acuityscheduling.com");
  assertEquals(url.pathname, "/api/v1/me");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("12345:abc-key")}`);
});

Deno.test("basic: test reports failure when credential missing", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("missing"));
});

Deno.test("basic: test reports failure with status code when API rejects", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthorized" } }]);
  const result = await auth.test({ credential: { userId: "12345", apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});

Deno.test("basic: afterConnect fetches /me and returns nested user label data", async () => {
  const { ctx } = mockCtx([{ body: { name: "Acme Salon", email: "a@acme.com" } }]);
  const result = await auth.afterConnect!({ credential: {} }, ctx);
  assertEquals(result, { user: { name: "Acme Salon", email: "a@acme.com" } });
});
