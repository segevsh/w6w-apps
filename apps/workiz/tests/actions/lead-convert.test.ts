import { assertEquals } from "@std/assert";
import leadConvert from "../../actions/lead-convert.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

/** The UUID this returns is the NEW JOB's, not the lead's. */
Deno.test("lead-convert: POSTs UUID and auth_secret and returns the new job identity", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ ClientId: "42", UUID: "j1", link: "x" }] }]);
  const out = await leadConvert.execute({ uuid: "l1", authSecret: "sec_1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/lead/convert/");
  assertEquals(bodyOf(calls[0]), { UUID: "l1", auth_secret: "sec_1" });
  assertEquals(out, [{ ClientId: "42", UUID: "j1", link: "x" }]);
});

/**
 * Not idempotent, deliberately: a retry whose repeat behaviour the vendor does
 * not document could create a second job.
 */
Deno.test("lead-convert: converting is not idempotent", () => {
  assertEquals(leadConvert.idempotent, false);
});

Deno.test("lead-convert: an empty answer becomes an empty array", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await leadConvert.execute({ uuid: "l1", authSecret: "s" }, ctx), []);
});
