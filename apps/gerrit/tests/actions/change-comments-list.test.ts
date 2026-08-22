import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/change-comments-list.ts";

const D = { display: { host: "https://gerrit.example.com" } };
const PREFIX = ")]}'\n";
const comments = {
  status: 200,
  body: PREFIX + JSON.stringify({
    "/COMMIT_MSG": [
      { id: "c0", message: "typo", unresolved: false, patch_set: 1, author: { username: "ada" } },
    ],
    "src/main.c": [
      {
        id: "c1",
        line: 12,
        message: "why?",
        unresolved: true,
        patch_set: 3,
        author: { username: "grace" },
      },
      {
        id: "c2",
        line: 40,
        message: "ok",
        unresolved: false,
        patch_set: 3,
        author: { username: "ada" },
      },
    ],
  }),
};

/** The response is an object keyed by path, not a list. */
Deno.test("change-comments-list: flattens the by-file object into comments", async () => {
  const { ctx, calls } = mockCtx([comments], D);
  const result = await action.execute({ changeId: "620421" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/a/changes/620421/comments");
  assertEquals(result.count, 3);
  assertEquals(result.files, ["/COMMIT_MSG", "src/main.c"]);
});

/** Gerrit reviews the commit message as a file. */
Deno.test("change-comments-list: counts comments on the commit message separately", async () => {
  const { ctx } = mockCtx([comments], D);
  const result = await action.execute({ changeId: "620421" }, ctx) as Record<string, unknown>;
  assertEquals(result.onCommitMessage, 1);
});

/** Unresolved threads block a submit on many projects. */
Deno.test("change-comments-list: filters to unresolved on request", async () => {
  const { ctx } = mockCtx([comments], D);
  const result = await action.execute({ changeId: "620421", unresolvedOnly: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.count, 1);
  assertEquals(result.unresolvedCount, 1);
});

Deno.test("change-comments-list: reports authors and the newest patch set", async () => {
  const { ctx } = mockCtx([comments], D);
  const result = await action.execute({ changeId: "620421" }, ctx) as Record<string, unknown>;
  assertEquals(result.authors, ["ada", "grace"]);
  assertEquals(result.latestPatchSet, 3);
});

/** The comments are somebody's review. */
Deno.test("change-comments-list: logs counts, never the comment text", async () => {
  const { ctx, logs } = mockCtx([comments], D);
  await action.execute({ changeId: "620421" }, ctx);
  assert(!/why\?/.test(JSON.stringify(logs)), JSON.stringify(logs));
});

Deno.test("change-comments-list: refuses a bare Change-Id", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ changeId: "I" + "a".repeat(40) }, ctx),
    Error,
    "NOT UNIQUE",
  );
});
