import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pull-request-merge.ts";

Deno.test("pull-request-merge: PUTs /pulls/{n}/merge with the strategy", async () => {
  const { ctx, calls } = mockCtx([{ body: { merged: true } }]);
  await action.execute(
    { owner: "acme", repository: "api", pullRequestNumber: 12, mergeMethod: "squash" },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api/pulls/12/merge");
  assertEquals(JSON.parse(calls[0].body!), { merge_method: "squash" });
});

Deno.test("pull-request-merge: passes the expected head SHA for compare-and-set merges", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { owner: "acme", repository: "api", pullRequestNumber: 12, sha: "deadbeef" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).sha, "deadbeef");
  assert(action.params?.find((p) => p.key === "sha")?.hint?.includes("Recommended"));
});
