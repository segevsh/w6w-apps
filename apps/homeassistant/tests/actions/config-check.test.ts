import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/config-check.ts";

Deno.test("config-check: a valid configuration is safe to restart", async () => {
  const { ctx, calls } = mockCtx([ok({ result: "valid", errors: null })], { display });
  const result = await action.execute!({}, ctx) as { valid: boolean; errors?: string };
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/config/core/check_config");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.valid, true);
  assertEquals(result.errors, undefined);
});

/** The whole point: finding out before restarting, not after. */
Deno.test("config-check: an invalid configuration warns loudly and carries the errors", async () => {
  const { ctx, logs } = mockCtx([
    ok({ result: "invalid", errors: "Integration 'nope' not found." }),
  ], { display });
  const result = await action.execute!({}, ctx) as { valid: boolean; errors: string };
  assertEquals(result.valid, false);
  assertEquals(result.errors, "Integration 'nope' not found.");
  assertEquals(logs[0].level, "warn");
  assert(/do not restart/.test(logs[0].message), logs[0].message);
});

Deno.test("config-check: takes no parameters", () => {
  assertEquals(action.params?.length ?? 0, 0);
});

/** A syntax error does not stop a running instance; it stops it coming back. */
Deno.test("config-check: says why checking before restarting matters", () => {
  assert(/stops it coming back/.test(action.description!), action.description);
});
