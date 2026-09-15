import { assertEquals } from "@std/assert";
import allocationCreate from "../../actions/allocation-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("allocation-create - POSTs /tasks with the typed fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { task_id: 1, project_id: 1345 } }]);
  const out = await allocationCreate.execute(
    {
      projectId: 1345,
      peopleId: 11223344,
      startDate: "2023-11-16",
      endDate: "2023-11-22",
      hours: 4.5,
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v3/tasks");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.project_id, 1345);
  assertEquals(body.people_id, 11223344);
  assertEquals(body.hours, 4.5);
  assertEquals(out, { task_id: 1, project_id: 1345 });
});

Deno.test("allocation-create - extraFields can assign several people via people_ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await allocationCreate.execute(
    {
      projectId: 1345,
      startDate: "2023-11-16",
      endDate: "2023-11-22",
      hours: 4,
      extraFields: { people_ids: [1, 2] },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.people_ids, [1, 2]);
  assertEquals("people_id" in body, false);
});
