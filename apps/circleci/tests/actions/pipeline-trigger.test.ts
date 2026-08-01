import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pipeline-trigger.ts";

Deno.test("pipeline-trigger: POSTs to /project/{slug}/pipeline with a branch body", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: "pipe1", number: 42, state: "created" } },
  ]);
  const result = await action.execute!({ projectSlug: "gh/org/repo", branch: "main" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://circleci.com/api/v2/project/gh/org/repo/pipeline");
  assertEquals(JSON.parse(calls[0].body!), { branch: "main" });
  assertEquals(result, { id: "pipe1", number: 42, state: "created" });
});

Deno.test("pipeline-trigger: sends tag instead of branch", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "pipe1" } }]);
  await action.execute!({ projectSlug: "gh/org/repo", tag: "v1.0.0" }, ctx);

  assertEquals(JSON.parse(calls[0].body!), { tag: "v1.0.0" });
});

Deno.test("pipeline-trigger: passes through pipeline parameters", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "pipe1" } }]);
  await action.execute!(
    { projectSlug: "gh/org/repo", parameters: { deploy: true } },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!), { parameters: { deploy: true } });
});

Deno.test("pipeline-trigger: rejects branch and tag together", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute!({ projectSlug: "gh/org/repo", branch: "main", tag: "v1" }, ctx),
      ),
    Error,
    "mutually exclusive",
  );
});

Deno.test("pipeline-trigger: requires projectSlug", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "projectSlug");
});

Deno.test("pipeline-trigger: rejects a malformed projectSlug", async () => {
  const { ctx } = mockCtx([]);
  try {
    await action.execute!({ projectSlug: "org/repo" }, ctx);
    throw new Error("expected execute to throw");
  } catch (err) {
    assertStringIncludes((err as Error).message, "vcs-slug/org-name/repo-name");
  }
});
