import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/api-key-info.ts";

const ok = (results: unknown) => ({ status: 200, body: { success: true, results } });

/** A workflow can read the scopes and branch, rather than failing on step four. */
Deno.test("api-key-info: reports the scopes and whether any allows writing", async () => {
  const { ctx, calls } = mockCtx([ok({
    title: "Automation Bot",
    createdAt: "2026-01-01T00:00:00.000Z",
    scopes: ["candidates:read", "candidates:write"],
  })]);
  const result = await action.execute!({}, ctx) as { canWrite: boolean; scopes: string[] };
  assertEquals(calls[0].url, "https://api.ashbyhq.com/apiKey.info");
  assertEquals(calls[0].body, "{}");
  assertEquals(result.scopes, ["candidates:read", "candidates:write"]);
  assertEquals(result.canWrite, true);
});

Deno.test("api-key-info: a read-only key reports canWrite false", async () => {
  const { ctx } = mockCtx([ok({ title: "Reporting", scopes: ["jobs:read"] })]);
  const result = await action.execute!({}, ctx) as { canWrite: boolean };
  assertEquals(result.canWrite, false);
});

Deno.test("api-key-info: a response with no scopes does not crash", async () => {
  const { ctx } = mockCtx([ok({ title: "Bare" })]);
  const result = await action.execute!({}, ctx) as { scopes: string[]; canWrite: boolean };
  assertEquals(result.scopes, []);
  assertEquals(result.canWrite, false);
});

/** The response carries the key's title and scopes, never its value. */
Deno.test("api-key-info: says it needs the apiKeysRead scope itself", () => {
  assert(/apiKeysRead/.test(action.description!), action.description);
});
