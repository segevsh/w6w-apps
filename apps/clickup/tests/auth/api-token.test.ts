import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import apiToken from "../../auth/api-token.ts";

Deno.test("api-token: signs with a RAW Authorization header (no Bearer prefix)", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.clickup.com/api/v2/user",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await apiToken.sign!({ request, credential: { apiToken: "pk_123" } }, ctx);
  assertEquals(out.headers["authorization"], "pk_123");
});

Deno.test("api-token: test hook probes GET /user and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: { user: { id: 1 } } }]);
  const result = await apiToken.test({ credential: { apiToken: "pk_123" } }, ctx);
  assertEquals(result, { ok: true });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/user");
  assertEquals(calls[0].headers["authorization"], "pk_123");
});

Deno.test("api-token: test hook reports failure on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401 }]);
  const result = await apiToken.test({ credential: { apiToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("api-token: test hook flags a missing credential", async () => {
  const { ctx } = mockCtx([]);
  const result = await apiToken.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
});
