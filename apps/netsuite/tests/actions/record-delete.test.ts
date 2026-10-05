import { assertEquals, assertRejects } from "@std/assert";
import recordDelete from "../../actions/record-delete.ts";
import { BASE, mockCtx, nsError, run } from "../_helpers.ts";

Deno.test("record-delete: DELETEs the record and reports it", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await run(recordDelete, { recordType: "customer", id: "107" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${BASE}/services/rest/record/v1/customer/107`);
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true });
});

Deno.test("record-delete: a failure is raised, never reported as deleted", async () => {
  const { ctx } = mockCtx([nsError(404, "RCRD_DSNT_EXIST", "That record does not exist.")]);
  await assertRejects(
    async () => await run(recordDelete, { recordType: "customer", id: "999" }, ctx),
    Error,
    "does not exist",
  );
});
