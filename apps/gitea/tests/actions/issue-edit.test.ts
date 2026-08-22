import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-edit.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

Deno.test("issue-edit: PATCHes only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { number: 7 } }], conn);
  await action.execute!({ repo: "web", issueNumber: 7, state: "closed", title: "" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://git.example.com/api/v1/repos/acme/web/issues/7");
  assertEquals(JSON.parse(calls[0].body!), { state: "closed" });
});

Deno.test("issue-edit: assignees replace the whole list", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ repo: "web", issueNumber: 7, assignees: "ada, bob" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).assignees, ["ada", "bob"]);
});

Deno.test("issue-edit: an edit with nothing set is refused, not sent", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "web", issueNumber: 7 }, ctx),
    Error,
    "nothing to change",
  );
  assertEquals(calls.length, 0);
});
