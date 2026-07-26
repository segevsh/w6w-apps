import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/release-create.ts";

const REPO = { owner: "acme", repository: "api" };

Deno.test("release-create: POSTs /releases with snake_case field names", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await action.execute(
    { ...REPO, tagName: "v1.0.0", targetCommitish: "main", generateReleaseNotes: true },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api/releases");
  assertEquals(JSON.parse(calls[0].body!), {
    tag_name: "v1.0.0",
    target_commitish: "main",
    generate_release_notes: true,
  });
});

Deno.test("release-create: sends draft:false rather than dropping it", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ ...REPO, tagName: "v1", draft: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).draft, false);
});
