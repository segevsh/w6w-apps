import { assertEquals } from "@std/assert";
import submissionRefillLinkSet from "../../actions/submission-refill-link-set.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("submission-refill-link-set: POSTs {enable} to /api/submissions/{id}/refill-link", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }, { body: { success: true } }]);
  await submissionRefillLinkSet.execute({ submission: 761506, enable: true }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/submissions/761506/refill-link");
  assertEquals(bodyOf(calls[0]), { enable: true });
  assertEquals(calls[0].headers["content-type"], "application/json");
  await submissionRefillLinkSet.execute({ submission: 761506, enable: false }, ctx);
  assertEquals(bodyOf(calls[1]), { enable: false });
});
