import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/change-files-list.ts";

const D = { display: { host: "https://gerrit.example.com" } };
const PREFIX = ")]}'\n";
const files = {
  status: 200,
  body: PREFIX + JSON.stringify({
    "/COMMIT_MSG": { status: "M", lines_inserted: 7 },
    "src/main.c": { lines_inserted: 10, lines_deleted: 2 },
    "src/new.c": { status: "A", lines_inserted: 40 },
    "docs/old.md": { status: "D", lines_deleted: 20 },
    "docs/moved.md": { status: "R", old_path: "docs/was.md" },
  }),
};

/** The commit message is an entry, so a naive count is one too many. */
Deno.test("change-files-list: excludes the commit message from the file count", async () => {
  const { ctx, calls } = mockCtx([files], D);
  const result = await action.execute({ changeId: "620421" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/a/changes/620421/revisions/current/files/");
  assertEquals(result.count, 4);
  assertEquals(result.touchesCommitMessage, true);
});

/** A modified file has no status letter at all. */
Deno.test("change-files-list: gives a modified file the status M itself", async () => {
  const { ctx } = mockCtx([files], D);
  const result = await action.execute({ changeId: "620421" }, ctx) as Record<string, unknown>;
  const main = (result.files as Array<{ path: string; status: string }>).find((f) =>
    f.path === "src/main.c"
  )!;
  assertEquals(main.status, "M", "Gerrit omits the letter for a modification");
});

Deno.test("change-files-list: separates added, deleted and renamed files", async () => {
  const { ctx } = mockCtx([files], D);
  const result = await action.execute({ changeId: "620421" }, ctx) as Record<string, unknown>;
  assertEquals(result.added, ["src/new.c"]);
  assertEquals(result.deleted, ["docs/old.md"]);
  assertEquals(result.renamed, ["docs/moved.md"]);
});

/** Size is the signal for routing a review. */
Deno.test("change-files-list: totals the lines, excluding the commit message", async () => {
  const { ctx } = mockCtx([files], D);
  const result = await action.execute({ changeId: "620421" }, ctx) as Record<string, unknown>;
  assertEquals(result.linesInserted, 50);
  assertEquals(result.linesDeleted, 22);
});

Deno.test("change-files-list: a path prefix filters here and in the query", async () => {
  const { ctx, calls } = mockCtx([files], D);
  const result = await action.execute({ changeId: "620421", pathPrefix: "src/" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(new URL(calls[0].url).searchParams.get("q"), "src/");
  assertEquals(result.paths, ["src/main.c", "src/new.c"]);
});

Deno.test("change-files-list: a revision number is used as given", async () => {
  const { ctx, calls } = mockCtx([files], D);
  await action.execute({ changeId: "620421", revision: "3" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/a/changes/620421/revisions/3/files/");
});

Deno.test("change-files-list: refuses a bare Change-Id", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ changeId: "I" + "b".repeat(40) }, ctx),
    Error,
    "NOT UNIQUE",
  );
});
