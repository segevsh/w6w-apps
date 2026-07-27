import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-create.ts";

Deno.test("file-create: POSTs the encoded file path with branch/content/message", async () => {
  const { ctx, calls } = mockCtx([{ body: { file_path: "docs/a.md" } }]);
  await action.execute(
    { projectId: "1", filePath: "docs/a.md", branch: "main", content: "hi", commitMessage: "add" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://gitlab.com/api/v4/projects/1/repository/files/docs%2Fa.md");
  assertEquals(JSON.parse(calls[0].body!), {
    branch: "main",
    content: "hi",
    commit_message: "add",
  });
});
