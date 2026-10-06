import { assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("api-key: sign sets a bare Authorization header (no Bearer prefix)", async () => {
  const request = { url: "https://api.short.io/links", method: "GET", headers: {} };
  const out = await auth.sign!({ request, credential: { apiKey: " sk_secret " } }, mockCtx().ctx);
  assertEquals(out.headers["authorization"], "sk_secret");
});

Deno.test("api-key: test passes on a JSON array from GET /api/domains", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, hostname: "go.example.com" }] }]);
  const out = await auth.test({ credential: { apiKey: "sk_secret" } }, ctx);
  assertEquals(out.ok, true);
  assertEquals(pathOf(calls[0].url), "/api/domains");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers["authorization"], "sk_secret");
});

Deno.test("api-key: test classifies by body — the vendor's Unauthorized error is a rejection", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Unauthorized" } }]);
  const out = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("Unauthorized"), true);
});

Deno.test("api-key: a 200 that is not a domain list is not a pass", async () => {
  const { ctx } = mockCtx([{ body: "<html>shell</html>" }]);
  assertEquals((await auth.test({ credential: { apiKey: "k" } }, ctx)).ok, false);
});

Deno.test("api-key: test short-circuits on a missing key without fetching", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await auth.test({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a 5xx is a failure with the status in the message", async () => {
  const { ctx } = mockCtx([{ status: 503, body: { message: "down" } }]);
  const out = await auth.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("503"), true);
});
