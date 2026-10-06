import { assertEquals } from "@std/assert";
import leadTaskCreate from "../../actions/lead-task-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-task-create: POST .../createTask coerces taskType to a number", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await leadTaskCreate.execute({
    leadIdOrEmail: "a@b.com",
    description: "Call back",
    dueDate: "2026-10-10",
    taskType: "2" as unknown as number,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/zapier/leads/a%40b.com/createTask");
  assertEquals(bodyOf(calls[0]), { description: "Call back", dueDate: "2026-10-10", taskType: 2 });
});

Deno.test("lead-task-create: taskType 0 is kept; unset optionals are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await leadTaskCreate.execute(
    { leadIdOrEmail: "1", description: "d", taskType: 0, type: "Call" },
    ctx,
  );
  assertEquals(bodyOf(calls[0]), { description: "d", type: "Call", taskType: 0 });
});
