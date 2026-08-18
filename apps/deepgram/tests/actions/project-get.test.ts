import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

const display = { projectId: "proj_1" };

Deno.test("project-get: reads the connection's own project", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { project_id: "proj_1", name: "Acme" } }],
    { display },
  );
  const result = await action.execute!({}, ctx) as { name: string };
  assertEquals(calls[0].url, "https://api.deepgram.com/v1/projects/proj_1");
  assertEquals(result.name, "Acme");
});

/** An invoiced project has no balance to read, and knowing that in advance matters. */
Deno.test("project-get: connects the contract shape to the quota check", () => {
  assert(/pre-paid balance/.test(action.description!), action.description);
});
