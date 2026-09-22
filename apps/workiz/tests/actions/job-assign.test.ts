import { assertEquals } from "@std/assert";
import jobAssign from "../../actions/job-assign.ts";
import { bodyOf, mockCtx, pathOf, writeAck } from "../_helpers.ts";

/**
 * The job assign call answers the `{flag, data}` envelope, where the lead side
 * answers a bare array — the two resources genuinely differ.
 */
Deno.test("job-assign: POSTs UUID, User and auth_secret to /job/assign/", async () => {
  const { ctx, calls } = mockCtx([{ body: writeAck([{ UUID: "j1", ClientId: 42, link: "x" }]) }]);
  const out = await jobAssign.execute({ uuid: "j1", user: "Sam", authSecret: "sec_1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/job/assign/");
  assertEquals(bodyOf(calls[0]), { UUID: "j1", User: "Sam", auth_secret: "sec_1" });
  assertEquals(out.flag, true);
  assertEquals(out.data, [{ UUID: "j1", ClientId: 42, link: "x" }]);
});

Deno.test("job-assign: uuid, user and auth_secret are all required", () => {
  for (const key of ["uuid", "user", "authSecret"]) {
    assertEquals(jobAssign.params?.find((p) => p.key === key)?.required, true, key);
  }
});

Deno.test("job-assign: assigning is idempotent", () => {
  assertEquals(jobAssign.idempotent, true);
});
