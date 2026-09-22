import { assertEquals } from "@std/assert";
import leadUpdate from "../../actions/lead-update.ts";
import { bodyOf, mockCtx, pathOf, writeAck } from "../_helpers.ts";

Deno.test("lead-update: POSTs to /lead/update/ with UUID and auth_secret", async () => {
  const { ctx, calls } = mockCtx([{ body: writeAck([{ UUID: "l1" }]) }]);
  const out = await leadUpdate.execute(
    { uuid: "l1", authSecret: "sec_xyz", Status: "In progress", LastName: "Reyes" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/lead/update/");
  assertEquals(bodyOf(calls[0]), {
    UUID: "l1",
    auth_secret: "sec_xyz",
    Status: "In progress",
    LastName: "Reyes",
  });
  assertEquals(out.flag, true);
});

/** `Tags` is the one array-valued field on the lead body. */
Deno.test("lead-update: Tags is sent as a JSON array", async () => {
  const { ctx, calls } = mockCtx([{ body: writeAck([]) }]);
  await leadUpdate.execute({ uuid: "l1", authSecret: "s", Tags: ["urgent", "repeat"] }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}").Tags, ["urgent", "repeat"]);
});

Deno.test("lead-update: both UUID and auth_secret are required, as Workiz requires in practice", () => {
  assertEquals(leadUpdate.params?.find((p) => p.key === "uuid")?.required, true);
  assertEquals(leadUpdate.params?.find((p) => p.key === "authSecret")?.required, true);
});

Deno.test("lead-update: updating is idempotent", () => {
  assertEquals(leadUpdate.idempotent, true);
});
