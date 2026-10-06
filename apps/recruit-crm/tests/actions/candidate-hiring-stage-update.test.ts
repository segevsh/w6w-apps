import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/candidate-hiring-stage-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("candidate-hiring-stage-update: POSTs a JSON stage change to /hiring-stages/{job}", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: { status_id: 3, label: "Interview" } } }]);
  await action.execute({
    candidateId: "5",
    jobId: "8",
    statusId: 3,
    statusLabel: "Interview",
    remark: "Strong",
    stageDate: "2026-10-01T10:00:00Z",
    visibility: 0,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/candidates/5/hiring-stages/8");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    status: { status_id: 3, label: "Interview" },
    remark: "Strong",
    stage_date: "2026-10-01T10:00:00Z",
    visibility: 0,
  });
});

Deno.test("candidate-hiring-stage-update: the label and optional fields are omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ candidateId: "5", jobId: "8", statusId: 2 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { status: { status_id: 2 } });
});

Deno.test("candidate-hiring-stage-update: a stage id is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await (action.execute({ candidateId: "5", jobId: "8" } as never, ctx)),
    Error,
    "statusId",
  );
  assertEquals(calls.length, 0);
});
