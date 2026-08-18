import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-domain-add.ts";

Deno.test("project-domain-add: POSTs the domain to the project", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { name: "a.com", verified: false } }], {
    display: {},
  });
  const result = await action.execute!({ projectId: "my-app", name: "a.com" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v10/projects/my-app/domains");
  assertEquals(JSON.parse(calls[0].body!), { name: "a.com" });
  // Adding it does not make it live — `verified` is the flag that matters.
  assertEquals((result as Record<string, unknown>).verified, false);
});

Deno.test("project-domain-add: redirect and branch options are sent when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await action.execute!({
    projectId: "my-app",
    name: "a.com",
    redirect: "b.com",
    redirectStatusCode: 308,
    gitBranch: "staging",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "a.com",
    gitBranch: "staging",
    redirect: "b.com",
    redirectStatusCode: 308,
  });
});

Deno.test("project-domain-add: project and domain are both required", async () => {
  const a = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ name: "a.com" }, a.ctx),
    Error,
    "`projectId`",
  );
  const b = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ projectId: "my-app" }, b.ctx),
    Error,
    "`name`",
  );
  assertEquals(a.calls.length + b.calls.length, 0);
});
