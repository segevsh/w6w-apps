import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-update.ts";

const display = { orgId: "org-1" };

/** JSON:API: the resource identity travels in the body with the attributes. */
Deno.test("project-update: wraps attributes in the JSON:API data envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }], { display });
  await action.execute!({
    projectId: "p1",
    businessCriticality: ["high"],
    tags: '[{"key":"team","value":"platform"}]',
  }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      id: "p1",
      type: "project",
      attributes: {
        business_criticality: ["high"],
        tags: [{ key: "team", value: "platform" }],
      },
    },
  });
});

Deno.test("project-update: refuses a no-op and names bad JSON", async () => {
  const noop = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ projectId: "p1" }, noop.ctx),
    Error,
    "nothing to update",
  );
  const bad = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ projectId: "p1", tags: "{oops" }, bad.ctx),
    Error,
    "`tags` is not valid JSON",
  );
  assertEquals(noop.calls.length + bad.calls.length, 0);
});
