import { assertEquals, assertRejects } from "@std/assert";
import legalHoldRelease from "../../actions/legal-hold-release.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("legal-hold-release: DELETEs and returns released_at", async () => {
  const body = {
    id: "lgh_x",
    object: "legal_hold",
    released: true,
    released_at: "2026-10-05T00:00:00Z",
  };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await legalHoldRelease.execute({ holdId: "lgh_x" }, ctx), body);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/legal-holds/lgh_x");
});

Deno.test("legal-hold-release: is idempotent (vendor returns the original released_at)", async () => {
  assertEquals(legalHoldRelease.idempotent, true);
  const { ctx } = mockCtx([{ status: 404, body: { code: "NOT_FOUND", message: "none" } }]);
  await assertRejects(
    async () => await legalHoldRelease.execute({ holdId: "lgh_x" }, ctx),
    Error,
    "404",
  );
});
