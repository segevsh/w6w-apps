import { assert, assertEquals, assertRejects } from "@std/assert";
import custodianRemove from "../../actions/custodian-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("custodian-remove: DELETEs the entry under the hold", async () => {
  const body = { id: "lhc_x", object: "legal_hold_custodian", removed: true, removed_at: "t" };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await custodianRemove.execute({ holdId: "lgh_x", custodianId: "lhc_x" }, ctx), body);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/legal-holds/lgh_x/custodians/lhc_x");
});

Deno.test("custodian-remove: an unissued id is the vendor's 404", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { code: "NOT_FOUND", message: "never issued" } }]);
  await assertRejects(
    async () => await custodianRemove.execute({ holdId: "lgh_x", custodianId: "lhc_y" }, ctx),
    Error,
    "never issued",
  );
  assert(custodianRemove.idempotent === false);
});
