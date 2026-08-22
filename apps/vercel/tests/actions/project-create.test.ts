import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-create.ts";

Deno.test("project-create: POSTs to /v11/projects with the git repository", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "prj_1" } }], { display: {} });
  await action.execute!({
    name: "my-app",
    framework: "nextjs",
    gitRepository: '{"type":"github","repo":"acme/web"}',
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v11/projects");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "my-app",
    framework: "nextjs",
    gitRepository: { type: "github", repo: "acme/web" },
  });
});

Deno.test("project-create: a name is required and bad JSON is named", async () => {
  const noName = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, noName.ctx), Error, "`name`");
  const badJson = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ name: "x", gitRepository: "{oops" }, badJson.ctx),
    Error,
    "gitRepository",
  );
  assertEquals(noName.calls.length + badJson.calls.length, 0);
});
