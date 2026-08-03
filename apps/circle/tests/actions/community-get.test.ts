import { assertEquals } from "@std/assert";
import { API, mockCtx, queryOf } from "../_helpers.ts";
import action from "../../actions/community-get.ts";

Deno.test("community-get: GETs /community with no parameters at all", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Acme" } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, `${API}/community`);
  assertEquals(queryOf(calls[0]), {});
  assertEquals(out, { id: 1, name: "Acme" });
});

Deno.test("community-get: takes no params — the token selects the community", () => {
  assertEquals(action.params, []);
});

/**
 * Deliberately NOT tagged as a health check. `auth/api-token.ts`'s `test` hook
 * already probes this same endpoint and the host projects it into the health
 * surface as `auth:api-token`. Tagging this too would spend two requests per
 * sweep against a 5,000/month allowance to answer one question.
 */
Deno.test("community-get: is not health-tagged, so the credential probe is not doubled", () => {
  assertEquals(action.healthCheck, undefined);
});
