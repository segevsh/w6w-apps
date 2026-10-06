import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "title": "Call back",
  "description": "Do it",
  "estimated_workload": 3,
  "task_nature_id": 1,
  "company_id": 42,
  "project_id": 7,
  "start_date": "25/04/2023",
  "end_date": "30/04/2023",
  "estimated_end_date": "29/04/2023",
  "workforces_id": "[1, 2]",
};

Deno.test("task-create: POST /api/v2/tasks with the documented query, header and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1 } }]);
  const out = await taskCreate.execute(INPUT as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/tasks");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["page"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "title": "Call back",
    "description": "Do it",
    "estimated_workload": 3,
    "task_nature_id": 1,
    "company_id": 42,
    "project_id": 7,
    "start_date": "25/04/2023",
    "end_date": "30/04/2023",
    "estimated_end_date": "29/04/2023",
    "workforces_id": [
      1,
      2,
    ],
  });
  assertEquals(
    calls[0].headers["userapikey"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { id: 1 });
});

Deno.test("task-create: an Axonaut error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden access") }]);
  const err = await assertRejects(async () => await taskCreate.execute(INPUT as never, ctx));
  assertStringIncludes((err as Error).message, "Axonaut 403: Forbidden access");
});

Deno.test("task-create: invalid JSON in workforces_id is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () =>
    await (taskCreate.execute({
      ...({
        "title": "Call back",
        "description": "Do it",
        "estimated_workload": 3,
        "task_nature_id": 1,
        "company_id": 42,
        "project_id": 7,
        "start_date": "25/04/2023",
        "end_date": "30/04/2023",
        "estimated_end_date": "29/04/2023",
        "workforces_id": "[1, 2]",
      }),
      "workforces_id": "{not json",
    } as never, ctx))
  );
  assertStringIncludes((err as Error).message, "Axonaut: workforces_id");
  assertEquals(calls.length, 0);
});
