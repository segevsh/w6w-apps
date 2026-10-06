import { assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { bodyOf, mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("task-create: POSTs a manual task for a prospect and owner", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: single("task", 8) }]);
  await taskCreate.execute({
    action: "call",
    dueAt: "2026-10-10T09:00:00Z",
    note: "Follow up",
    prospectId: 1,
    ownerId: 2,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/tasks");
  assertEquals(bodyOf(calls[0]), {
    data: {
      type: "task",
      attributes: { action: "call", dueAt: "2026-10-10T09:00:00Z", note: "Follow up" },
      relationships: {
        prospect: { data: { type: "prospect", id: 1 } },
        owner: { data: { type: "user", id: 2 } },
      },
    },
  });
});

Deno.test("task-create: action choices match Outreach's documented values", () => {
  const action = taskCreate.params!.find((p) => p.key === "action")!;
  const values = (action.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values, ["action_item", "call", "email", "in_person"]);
});
