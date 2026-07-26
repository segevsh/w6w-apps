import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-create.ts";

const REPO = { owner: "acme", repository: "api" };

Deno.test("issue-create: POSTs /repos/{owner}/{repo}/issues", async () => {
  const { ctx, calls } = mockCtx([{ body: { number: 1 } }]);
  await action.execute({ ...REPO, title: "Bug" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api/issues");
  assertEquals(JSON.parse(calls[0].body!), { title: "Bug" });
});

Deno.test("issue-create: splits the comma-separated assignees and labels into arrays", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ ...REPO, title: "Bug", assignees: "a, b", labels: "p1,bug" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.assignees, ["a", "b"]);
  assertEquals(body.labels, ["p1", "bug"]);
});

Deno.test("issue-create: is not idempotent — a retry files a duplicate", () => {
  assertEquals(action.idempotent, false);
});
