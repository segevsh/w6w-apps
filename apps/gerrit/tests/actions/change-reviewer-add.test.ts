import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/change-reviewer-add.ts";

const D = { display: { host: "https://gerrit.example.com" } };
const PREFIX = ")]}'\n";
const result = (body: unknown) => ({ status: 200, body: PREFIX + JSON.stringify(body) });

Deno.test("change-reviewer-add: posts the reviewer and reports who was added", async () => {
  const { ctx, calls } = mockCtx([result({ reviewers: [{ username: "grace" }] })], D);
  const output = await action.execute(
    { changeId: "620421", reviewer: "grace@example.com" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(new URL(calls[0].url).pathname, "/a/changes/620421/reviewers");
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals(body.reviewer, "grace@example.com");
  assertEquals(body.state, "REVIEWER");
  assertEquals(output.added, ["grace"]);
  assertEquals(output.succeeded, true);
});

/** CC is "you should know"; reviewer is "you must look". */
Deno.test("change-reviewer-add: a CC lands in the ccs list", async () => {
  const { ctx, calls } = mockCtx([result({ ccs: [{ name: "Platform Team" }] })], D);
  const output = await action.execute(
    { changeId: "620421", reviewer: "platform", state: "CC" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(JSON.parse(calls[0].body!).state, "CC");
  assertEquals(output.added, ["Platform Team"]);
});

/** A group expands and everybody in it is notified. */
Deno.test("change-reviewer-add: notes when a name expanded to several people", async () => {
  const { ctx, logs } = mockCtx([
    result({ reviewers: [{ username: "a" }, { username: "b" }, { username: "c" }] }),
  ], D);
  const output = await action.execute({ changeId: "620421", reviewer: "team" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(output.addedCount, 3);
  assert(
    logs.some((l) => /resolved to a group/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** Gerrit reports an unresolvable name inside a 200. */
Deno.test("change-reviewer-add: surfaces an error returned in a successful response", async () => {
  const { ctx, logs } = mockCtx([result({ error: "Account 'nobody' not found" })], D);
  const output = await action.execute({ changeId: "620421", reviewer: "nobody" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(output.succeeded, false);
  assertEquals(output.error, "Account 'nobody' not found");
  assert(
    logs.some((l) => l.level === "warn" && /not a failed request/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("change-reviewer-add: the notify setting is passed through", async () => {
  const { ctx, calls } = mockCtx([result({ reviewers: [{ username: "a" }] })], D);
  await action.execute({ changeId: "620421", reviewer: "a", notify: "NONE" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).notify, "NONE");
});

Deno.test("change-reviewer-add: requires a reviewer", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ changeId: "620421" }, ctx),
    Error,
    "`reviewer` is required",
  );
});
