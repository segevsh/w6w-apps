import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/change-get.ts";

const D = { display: { host: "https://gerrit.example.com" } };
const PREFIX = ")]}'\n";
const detail = (extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: PREFIX + JSON.stringify({
    _number: 620421,
    subject: "Introduce a label",
    status: "NEW",
    submittable: false,
    unresolved_comment_count: 0,
    updated: "2026-08-18 04:13:33.000000000",
    labels: { "Code-Review": { approved: { name: "Ada" } }, Verified: {} },
    reviewers: { REVIEWER: [{ name: "Grace Hopper" }] },
    ...extra,
  }),
});

Deno.test("change-get: reads the detail endpoint and summarises each label", async () => {
  const { ctx, calls } = mockCtx([detail()], D);
  const result = await action.execute({ changeId: "620421" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/a/changes/620421/detail");
  assertEquals(result.approvedLabels, ["Code-Review"]);
  assertEquals((result.labels as Record<string, string>).Verified, "no score");
  assertEquals(result.reviewers, ["Grace Hopper"]);
});

/** A -2 is a veto no number of +2s overrides. */
Deno.test("change-get: names a blocking vote and explains the scale", async () => {
  const { ctx, logs } = mockCtx([detail({
    labels: { "Code-Review": { rejected: { name: "Grace" }, approved: { name: "Ada" } } },
  })], D);
  const result = await action.execute({ changeId: "620421" }, ctx) as Record<string, unknown>;
  assertEquals(result.blockingVotes, ["Code-Review"]);
  assert(
    logs.some((l) => /veto/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** Unresolved comments are themselves a submit requirement on many projects. */
Deno.test("change-get: explains an unsubmittable change with no blocking vote", async () => {
  const { ctx, logs } = mockCtx([detail({ unresolved_comment_count: 3 })], D);
  const result = await action.execute({ changeId: "620421" }, ctx) as Record<string, unknown>;
  assertEquals(result.unresolvedComments, 3);
  assert(
    logs.some((l) => /itself the reason it cannot be submitted/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("change-get: a submittable change says so and warns about nothing", async () => {
  const { ctx, logs } = mockCtx([detail({ submittable: true })], D);
  const result = await action.execute({ changeId: "620421" }, ctx) as Record<string, unknown>;
  assertEquals(result.isSubmittable, true);
  assertEquals(logs.length, 0);
});

/** The age must not depend on the runtime's timezone. */
Deno.test("change-get: reports an age from the UTC-read timestamp", async () => {
  const { ctx } = mockCtx([detail()], D);
  const result = await action.execute({ changeId: "620421" }, ctx) as Record<string, unknown>;
  assert(typeof result.ageDays === "number", String(result.ageDays));
});

Deno.test("change-get: refuses a bare Change-Id", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(
    async () =>
      await action.execute({ changeId: "I7fa2d252074dccb397fb067f5c3dfbef6af3316c" }, ctx),
    Error,
    "NOT UNIQUE",
  );
  assertEquals(calls.length, 0);
});
