import { assertEquals } from "@std/assert";
import leadUnassign from "../../actions/lead-unassign.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-unassign: POSTs UUID, User and auth_secret to /lead/unassign/", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ LeadId: "7", UUID: "l1", link: "x" }] }]);
  const out = await leadUnassign.execute({ uuid: "l1", user: "Sam", authSecret: "sec_1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/lead/unassign/");
  assertEquals(bodyOf(calls[0]), { UUID: "l1", User: "Sam", auth_secret: "sec_1" });
  assertEquals(out.length, 1);
});

Deno.test("lead-unassign: an empty answer becomes an empty array", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await leadUnassign.execute({ uuid: "l1", user: "Sam", authSecret: "s" }, ctx), []);
});

Deno.test("lead-unassign: unassigning is idempotent", () => {
  assertEquals(leadUnassign.idempotent, true);
});
