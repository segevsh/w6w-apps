import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-delete.ts";

Deno.test("file-delete: DELETEs the contents route with the required SHA", async () => {
  const { ctx, calls } = mockCtx([{ body: { commit: {} } }]);
  await action.execute(
    { owner: "acme", repository: "api", filePath: "a.txt", commitMessage: "rm", sha: "abc" },
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(JSON.parse(calls[0].body!), { message: "rm", sha: "abc" });
});

Deno.test("file-delete: the SHA is required — GitHub will not delete without it", () => {
  assert(action.params?.find((p) => p.key === "sha")?.required);
});
