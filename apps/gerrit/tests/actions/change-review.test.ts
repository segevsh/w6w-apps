import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/change-review.ts";

const D = { display: { host: "https://gerrit.example.com" } };
const ok = { status: 200, body: ")]}'\n{}" };

Deno.test("change-review: posts to the revision's review endpoint", async () => {
  const { ctx, calls } = mockCtx([ok], D);
  const result = await action.execute(
    { changeId: "620421", label: "Verified", value: 1, message: "CI passed" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(new URL(calls[0].url).pathname, "/a/changes/620421/revisions/current/review");
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals(body.labels, { Verified: 1 });
  assertEquals(body.message, "CI passed");
  assertEquals(result.isApproval, false);
});

/** Code-Review +2 is a person taking responsibility, not a bot's job. */
Deno.test("change-review: warns when automation grants a Code-Review +2", async () => {
  const { ctx, logs } = mockCtx([ok], D);
  const result = await action.execute(
    { changeId: "620421", label: "Code-Review", value: 2, message: "lgtm" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.isApproval, true);
  assert(
    logs.some((l) => l.level === "warn" && /takes responsibility for it/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** A -2 cannot be overridden by any number of +2s. */
Deno.test("change-review: warns about a blocking vote and reports what it means", async () => {
  const { ctx, logs } = mockCtx([ok], D);
  const result = await action.execute(
    { changeId: "620421", label: "Code-Review", value: -2, message: "no" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.isBlocking, true);
  assert(/veto/.test(String(result.meaning)), String(result.meaning));
  assert(
    logs.some((l) => /no number of \+2s overrides it/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("change-review: a message with no vote is allowed", async () => {
  const { ctx, calls } = mockCtx([ok], D);
  await action.execute({ changeId: "620421", message: "Just a note", value: 0 }, ctx);
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals(body.message, "Just a note");
  assertEquals("labels" in body, false);
});

Deno.test("change-review: refuses a value outside Gerrit's scale, and an empty review", async () => {
  const { ctx, calls } = mockCtx([], D);
  const range = await assertRejects(
    async () => await action.execute({ changeId: "620421", value: 5 }, ctx),
    Error,
  );
  assert(/not a rating/.test(range.message), range.message);
  await assertRejects(
    async () => await action.execute({ changeId: "620421", value: 0 }, ctx),
    Error,
    "does nothing",
  );
  assertEquals(calls.length, 0);
});

/** A vote lands on one patch set. */
Deno.test("change-review: reports which revision the vote landed on", async () => {
  const { ctx, calls } = mockCtx([ok], D);
  const result = await action.execute(
    { changeId: "620421", label: "Verified", value: 1, revision: "3" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/a/changes/620421/revisions/3/review");
  assertEquals(result.revision, "3");
});

/** The message is somebody's review comment. */
Deno.test("change-review: logs the votes, never the message", async () => {
  const { ctx, logs } = mockCtx([ok], D);
  await action.execute(
    { changeId: "620421", label: "Verified", value: 1, message: "secret internal detail" },
    ctx,
  );
  assert(!/secret internal detail/.test(JSON.stringify(logs)), JSON.stringify(logs));
});
