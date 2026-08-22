import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pull-request-get.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

Deno.test("pull-request-get: reads one pull request by number", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { number: 4, mergeable: null } }], conn);
  const result = await action.execute!({ repo: "web", pullNumber: 4 }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].url, "https://git.example.com/api/v1/repos/acme/web/pulls/4");
  assertEquals(result.mergeable, null);
});

/** null means "still computing", and treating it as false refuses good PRs. */
Deno.test("pull-request-get: the output says null is not false", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "mergeable")!.label.includes("null while Gitea"));
});

Deno.test("pull-request-get: a missing number fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "web" }, ctx),
    Error,
    "`pullNumber`",
  );
  assertEquals(calls.length, 0);
});
