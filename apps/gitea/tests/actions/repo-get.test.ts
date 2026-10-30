import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/repo-get.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

test("repo-get: reads one repository", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { default_branch: "main" } }], conn);
  const result = await action.execute!({ repo: "web" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://git.example.com/api/v1/repos/acme/web");
  assertEquals(result.default_branch, "main");
});

/** The default branch is what every file and branch action writes to. */
test("repo-get: the output explains the default branch and archived flag", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "default_branch")!.label.includes("what writes target"));
  assert(outputs.find((o) => o.key === "archived")!.label.includes("writes are refused"));
});

test("repo-get: a blank repository fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`repo` is required");
  assertEquals(calls.length, 0);
});
