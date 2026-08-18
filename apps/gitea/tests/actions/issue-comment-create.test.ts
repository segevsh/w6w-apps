import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-comment-create.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

/** A PR is an issue, so its conversation comments live on the same endpoint. */
Deno.test("issue-comment-create: POSTs to the issue's comments", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }], conn);
  await action.execute!({ repo: "web", issueNumber: 7, body: "Deployed" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://git.example.com/api/v1/repos/acme/web/issues/7/comments");
  assertEquals(JSON.parse(calls[0].body!), { body: "Deployed" });
});

Deno.test("issue-comment-create: number and body are both required", async () => {
  const noNumber = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "web", body: "x" }, noNumber.ctx),
    Error,
    "`issueNumber`",
  );
  const noBody = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "web", issueNumber: 7 }, noBody.ctx),
    Error,
    "`body`",
  );
  assertEquals(noNumber.calls.length + noBody.calls.length, 0);
  assertEquals(action.idempotent, false);
  assert(action.description!.includes("pull requests too"), action.description);
});
