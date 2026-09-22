import { assertEquals } from "@std/assert";
import leadAssign from "../../actions/lead-assign.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

/** The lead assign call addresses the lead in the BODY, unlike markLost/activate. */
Deno.test("lead-assign: POSTs UUID, User and auth_secret to /lead/assign/", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ LeadId: "7", UUID: "l1", link: "x" }] }]);
  const out = await leadAssign.execute({ uuid: "l1", user: "Sam", authSecret: "sec_1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/lead/assign/");
  assertEquals(bodyOf(calls[0]), { UUID: "l1", User: "Sam", auth_secret: "sec_1" });
  assertEquals(out, [{ LeadId: "7", UUID: "l1", link: "x" }]);
});

Deno.test("lead-assign: an empty answer becomes an empty array", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await leadAssign.execute({ uuid: "l1", user: "Sam", authSecret: "s" }, ctx), []);
});

Deno.test("lead-assign: uuid, user and auth_secret are all required", () => {
  for (const key of ["uuid", "user", "authSecret"]) {
    assertEquals(leadAssign.params?.find((p) => p.key === key)?.required, true, key);
  }
});

Deno.test("lead-assign: assigning is idempotent", () => {
  assertEquals(leadAssign.idempotent, true);
});
