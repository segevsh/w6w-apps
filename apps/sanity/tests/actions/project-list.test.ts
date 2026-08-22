import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

const conn = { display: { projectId: "abc123", dataset: "production" } };

/** The only call that is not project-scoped. */
Deno.test("project-list: goes to the bare management host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "abc123" }] }], conn);
  const out = await action.execute!({}, ctx) as { projects: unknown[] };
  assertEquals(out.projects.length, 1);
  assertEquals(new URL(calls[0].url).host, "api.sanity.io");
  assertEquals(new URL(calls[0].url).pathname, "/v2025-02-19/projects");
});
