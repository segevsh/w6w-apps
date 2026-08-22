import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-update.ts";

Deno.test("project-update: PATCHes only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "prj_1" } }], { display: {} });
  await action.execute!({ projectId: "my-app", nodeVersion: "22.x" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v9/projects/my-app");
  assertEquals(JSON.parse(calls[0].body!), { nodeVersion: "22.x" });
});

Deno.test("project-update: publicSource false survives, because false is a setting", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await action.execute!({ projectId: "my-app", publicSource: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { publicSource: false });
});

Deno.test("project-update: refuses a no-op", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ projectId: "my-app" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});
