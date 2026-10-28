import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

/** The one action with no project of its own — it is how you find the id. */
Deno.test("project-list: works without any connection default", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { projects: [{ id: "p1", friendlyName: "Analytics" }] },
  }]);
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/bigquery/v2/projects");
  assertEquals(result, [{ id: "p1", friendlyName: "Analytics" }]);
  assertEquals(action.params!.some((p) => p.key === "projectId"), false);
});

Deno.test("project-list: returnAll walks every page", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { projects: [{ id: "a" }], nextPageToken: "t2" } },
    { status: 200, body: { projects: [{ id: "b" }] } },
  ]);
  const result = await action.execute!({ returnAll: true }, ctx) as unknown[];
  assertEquals(result.length, 2);
  assertEquals(new URL(calls[1].url).searchParams.get("pageToken"), "t2");
});
