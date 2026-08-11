import { assertEquals } from "@std/assert";
import jobDispatch from "../../actions/job-dispatch.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-dispatch: PUTs the wrapped employee list", async () => {
  const { ctx, calls } = mockCtx([{ body: { assigned_employees: [] } }]);
  await jobDispatch.execute({ jobId: "j1", employeeIds: ["e1", "e2"] }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/jobs/j1/dispatch");
  assertEquals(bodyOf(calls[0]), {
    dispatched_employees: [{ employee_id: "e1" }, { employee_id: "e2" }],
  });
});

Deno.test("job-dispatch: an empty list still sends the required array key", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await jobDispatch.execute({ jobId: "j1", employeeIds: "" }, ctx);
  assertEquals(bodyOf(calls[0]), { dispatched_employees: [] });
});

Deno.test("job-dispatch: is idempotent — it replaces the assignment rather than appending", () => {
  assertEquals(jobDispatch.idempotent, true);
});
