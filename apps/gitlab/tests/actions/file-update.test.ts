import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-update.ts";

Deno.test("file-update: PUTs the encoded file path, forwarding the concurrency guard", async () => {
  const { ctx, calls } = mockCtx([{ body: { file_path: "docs/a.md" } }]);
  await action.execute(
    {
      projectId: "1",
      filePath: "docs/a.md",
      branch: "main",
      content: "hi",
      commitMessage: "edit",
      encoding: "base64",
      lastCommitId: "abc123",
    },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://gitlab.com/api/v4/projects/1/repository/files/docs%2Fa.md");
  assertEquals(JSON.parse(calls[0].body!), {
    branch: "main",
    content: "hi",
    commit_message: "edit",
    encoding: "base64",
    last_commit_id: "abc123",
  });
});
