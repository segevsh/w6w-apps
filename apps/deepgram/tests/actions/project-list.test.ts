import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

const display = { projectId: "proj_1" };

Deno.test("project-list: reads the projects this key reaches", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { projects: [{ project_id: "proj_1" }] } }],
    { display },
  );
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url, "https://api.deepgram.com/v1/projects");
  assertEquals(result.count, 1);
});

Deno.test("project-list: an empty response is a count of zero, not a crash", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }], { display });
  assertEquals((await action.execute!({}, ctx) as { count: number }).count, 0);
});

/** The first thing to check when a usage figure looks wrong. */
Deno.test("project-list: says what a project is the unit of", () => {
  assert(/billing/.test(action.description!), action.description);
});
