import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-comment-list.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

Deno.test("issue-comment-list: reads the issue's comments", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 1 }] }], conn);
  assertEquals(await action.execute!({ repo: "web", issueNumber: 7 }, ctx), [{ id: 1 }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/repos/acme/web/issues/7/comments");
});

Deno.test("issue-comment-list: a missing number fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "web" }, ctx),
    Error,
    "`issueNumber`",
  );
  assertEquals(calls.length, 0);
  // Timeline events are elsewhere, so the count will not match the web UI.
  assert(action.description!.includes("conversation comments"), action.description);
});
