import { assertEquals } from "@std/assert";
import jobUnassign from "../../actions/job-unassign.ts";
import { bodyOf, mockCtx, pathOf, writeAck } from "../_helpers.ts";

Deno.test("job-unassign: POSTs UUID, User and auth_secret to /job/unassign/", async () => {
  const { ctx, calls } = mockCtx([{ body: writeAck([{ UUID: "j1" }]) }]);
  const out = await jobUnassign.execute({ uuid: "j1", user: "Sam", authSecret: "sec_1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/job/unassign/");
  assertEquals(bodyOf(calls[0]), { UUID: "j1", User: "Sam", auth_secret: "sec_1" });
  assertEquals(out.flag, true);
});

Deno.test("job-unassign: unassigning is idempotent", () => {
  assertEquals(jobUnassign.idempotent, true);
  assertEquals(jobUnassign.key, "job-unassign");
});
