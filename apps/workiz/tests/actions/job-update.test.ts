import { assertEquals } from "@std/assert";
import jobUpdate from "../../actions/job-update.ts";
import { bodyOf, mockCtx, pathOf, writeAck } from "../_helpers.ts";

Deno.test("job-update: POSTs to /job/update/ with UUID, Status and auth_secret", async () => {
  const { ctx, calls } = mockCtx([{ body: writeAck([{ UUID: "j1" }]) }]);
  const out = await jobUpdate.execute(
    { uuid: "j1", authSecret: "sec_xyz", Status: "Done", SubStatus: "Paid" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/job/update/");
  assertEquals(bodyOf(calls[0]), {
    UUID: "j1",
    auth_secret: "sec_xyz",
    Status: "Done",
    SubStatus: "Paid",
  });
  assertEquals(out.flag, true);
});

/** Status AND SubStatus are both on the job update body — the lead body has no SubStatus. */
Deno.test("job-update: declares Status, SubStatus and Tags", () => {
  const keys = (jobUpdate.params ?? []).map((p) => p.key);
  for (const key of ["Status", "SubStatus", "Tags"]) {
    assertEquals(keys.includes(key), true, key);
  }
});

Deno.test("job-update: Tags is sent as a JSON array", async () => {
  const { ctx, calls } = mockCtx([{ body: writeAck([]) }]);
  await jobUpdate.execute({ uuid: "j1", authSecret: "s", Tags: ["warranty"] }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}").Tags, ["warranty"]);
});

Deno.test("job-update: both UUID and auth_secret are required, and updating is idempotent", () => {
  assertEquals(jobUpdate.params?.find((p) => p.key === "uuid")?.required, true);
  assertEquals(jobUpdate.params?.find((p) => p.key === "authSecret")?.required, true);
  assertEquals(jobUpdate.idempotent, true);
});
