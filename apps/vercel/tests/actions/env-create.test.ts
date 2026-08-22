import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/env-create.ts";

Deno.test("env-create: sends key, value, type and target, defaulting type to encrypted", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { created: {} } }], { display: {} });
  await action.execute!({
    projectId: "my-app",
    key: "API_URL",
    value: "https://api.example.com",
    target: ["production"],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v10/projects/my-app/env");
  assertEquals(JSON.parse(calls[0].body!), {
    key: "API_URL",
    value: "https://api.example.com",
    type: "encrypted",
    target: ["production"],
  });
});

Deno.test("env-create: upsert goes as Vercel's string flag", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await action.execute!({
    projectId: "my-app",
    key: "K",
    value: "v",
    target: ["production"],
    upsert: true,
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("upsert"), "true");
});

Deno.test("env-create: a branch-scoped variable without the preview target is caught here", async () => {
  // Vercel rejects this combination; failing locally names the actual problem.
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(
    async () =>
      await action.execute!({
        projectId: "my-app",
        key: "K",
        value: "v",
        target: ["production"],
        gitBranch: "main",
      }, ctx),
    Error,
    "`gitBranch` requires the `preview` target",
  );
  assertEquals(calls.length, 0);
});

Deno.test("env-create: key and value are both required", async () => {
  const noKey = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ projectId: "my-app", value: "v" }, noKey.ctx),
    Error,
    "`key`",
  );
  const noValue = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ projectId: "my-app", key: "K" }, noValue.ctx),
    Error,
    "`value`",
  );
  assertEquals(noKey.calls.length + noValue.calls.length, 0);
});
