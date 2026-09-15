import { assertEquals } from "@std/assert";
import statusCreate from "../../actions/status-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("status-create - POSTs /status and returns the {status: [...]} wrapper unchanged", async () => {
  // Real Float behaviour: creating an overlapping status returns BOTH the new
  // and the deleted-prior status in one array under the `status` key.
  const { ctx, calls } = mockCtx([
    {
      status: 201,
      body: { status: [{ status_id: 2, people_id: 123 }, { status_id: 1, people_id: 123 }] },
    },
  ]);
  const out = await statusCreate.execute(
    { statusTypeId: 1, peopleId: 123, startDate: "2024-11-16", endDate: "2024-12-06" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v3/status");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.status_type_id, 1);
  assertEquals(body.people_id, 123);
  assertEquals((out as { status: unknown[] }).status.length, 2);
});
