import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/change-submit.ts";

const D = { display: { host: "https://gerrit.example.com" } };
const PREFIX = ")]}'\n";
const detail = (extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: PREFIX + JSON.stringify({ status: "NEW", submittable: true, branch: "main", ...extra }),
});
const related = (statuses: string[]) => ({
  status: 200,
  body: PREFIX + JSON.stringify({ changes: statuses.map((status) => ({ status })) }),
});
const submitted = { status: 200, body: PREFIX + JSON.stringify({ status: "MERGED" }) };

Deno.test("change-submit: submits after confirmation", async () => {
  const { ctx, calls } = mockCtx([detail(), related(["NEW"]), submitted], D);
  const result = await action.execute({ changeId: "620421", confirm: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(new URL(calls[2].url).pathname, "/a/changes/620421/submit");
  assertEquals(result.submitted, true);
  assertEquals(result.status, "MERGED");
  assertEquals(result.branch, "main");
});

/** There is no un-submit. */
Deno.test("change-submit: refuses without confirmation, before any request", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ changeId: "620421" }, ctx),
    Error,
  );
  assert(/no un-submit/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

/** Gerrit would answer 409; checking first makes the refusal legible. */
Deno.test("change-submit: an unsubmittable change is refused with the reasons", async () => {
  const { ctx, calls } = mockCtx([detail({ submittable: false })], D);
  const err = await assertRejects(
    async () => await action.execute({ changeId: "620421", confirm: true }, ctx),
    Error,
  );
  assert(/which requirement is unmet/.test(err.message), err.message);
  assertEquals(calls.length, 1);
});

/** Submitting a change merges its unmerged ancestors too. */
Deno.test("change-submit: refuses to take a dependency chain without acknowledgement", async () => {
  const { ctx, calls } = mockCtx([detail(), related(["NEW", "NEW", "NEW"])], D);
  const err = await assertRejects(
    async () => await action.execute({ changeId: "620421", confirm: true }, ctx),
    Error,
  );
  assert(/2 unmerged parent change\(s\)/.test(err.message), err.message);
  assertEquals(calls.length, 2, "it must not submit");
});

Deno.test("change-submit: allowChain lets the whole chain through", async () => {
  const { ctx, logs } = mockCtx([detail(), related(["NEW", "NEW"]), submitted], D);
  const result = await action.execute(
    { changeId: "620421", confirm: true, allowChain: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.chainLength, 2);
  assert(
    logs.some((l) => l.level === "warn" && /landing a revert/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("change-submit: an already-merged change is a no-op, not an error", async () => {
  const { ctx, calls } = mockCtx([detail({ status: "MERGED" })], D);
  const result = await action.execute({ changeId: "620421", confirm: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.alreadyMerged, true);
  assertEquals(result.submitted, false);
  assertEquals(calls.length, 1);
});

Deno.test("change-submit: an abandoned change is refused", async () => {
  const { ctx } = mockCtx([detail({ status: "ABANDONED" })], D);
  await assertRejects(
    async () => await action.execute({ changeId: "620421", confirm: true }, ctx),
    Error,
    "restore it before submitting",
  );
});
