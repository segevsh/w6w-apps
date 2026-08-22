import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/env-update.ts";

Deno.test("env-update: PATCHes only what changed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "env_1" } }], { display: {} });
  await action.execute!({ projectId: "my-app", envId: "env_1", value: "new" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v9/projects/my-app/env/env_1");
  assertEquals(JSON.parse(calls[0].body!), { value: "new" });
});

Deno.test("env-update: an empty target list is not sent as an empty array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await action.execute!({ projectId: "my-app", envId: "env_1", target: [], key: "K" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { key: "K" });
});

Deno.test("env-update: refuses a no-op and needs both ids", async () => {
  const noop = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ projectId: "my-app", envId: "env_1" }, noop.ctx),
    Error,
    "nothing to update",
  );
  const noEnv = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ projectId: "my-app" }, noEnv.ctx),
    Error,
    "`envId`",
  );
  assertEquals(noop.calls.length + noEnv.calls.length, 0);
});
