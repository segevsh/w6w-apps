import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import hookDelete from "../../actions/hook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("hook-delete: DELETEs the hook and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await hookDelete.execute({ hookId: "42" }, ctx), { status: 204 });
  assertEquals(pathOf(calls[0].url), "/hook/42");
  assertEquals(calls[0].method, "DELETE");
});

test("hook-delete: is declared idempotent — the end state converges", () => {
  assertEquals(hookDelete.idempotent, true);
  assertEquals(hookDelete.type, "perform");
});

/**
 * Podio's reference badges Create Webhook and List Webhooks as App
 * Authentication capable and does NOT badge this one. That asymmetry is the
 * vendor's; the description reports it rather than hiding it.
 */
test("hook-delete: the description reports the missing App Authentication badge", () => {
  assert((hookDelete.description ?? "").includes("App Authentication"));
});
