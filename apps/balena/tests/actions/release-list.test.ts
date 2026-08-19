import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/release-list.ts";

const fleet = { status: 200, body: { d: [{ id: 1, slug: "acme/sensors" }] } };
const releases = {
  status: 200,
  body: {
    d: [
      { id: 903, commit: "ddd", raw_version: "1.3.0", status: "running" },
      { id: 902, commit: "ccc", raw_version: "1.2.0", status: "failed" },
      { id: 901, commit: "bbb", raw_version: "1.1.0", status: "success", is_invalidated: true },
      { id: 900, commit: "aaa", raw_version: "1.0.0", status: "success", is_invalidated: false },
    ],
  },
};

/** A release row exists as soon as a build starts. */
Deno.test("release-list: returns only successful, valid releases by default", async () => {
  const { ctx, calls } = mockCtx([fleet, releases]);
  const result = await action.execute({ fleet: "acme/sensors" }, ctx) as Record<string, unknown>;

  assert(
    new URL(calls[1].url).searchParams.get("$filter")!.includes("belongs_to__application eq 1"),
  );
  assertEquals(new URL(calls[1].url).searchParams.get("$orderby"), "created_at desc");
  assertEquals(result.count, 1);
  assertEquals(result.commits, ["aaa"]);
  assertEquals((result.latest as { id: number }).id, 900);
});

Deno.test("release-list: counts the builds it filtered out", async () => {
  const { ctx } = mockCtx([fleet, releases]);
  const result = await action.execute({ fleet: "acme/sensors" }, ctx) as Record<string, unknown>;
  assertEquals(result.failedCount, 1);
  assertEquals(result.runningCount, 1);
  assertEquals(result.invalidatedCount, 1);
});

/** Withdrawn, not deleted — devices already on it keep running. */
Deno.test("release-list: notes invalidated releases without including them", async () => {
  const { ctx, logs } = mockCtx([fleet, releases]);
  await action.execute({ fleet: "acme/sensors" }, ctx);
  assert(
    logs.some((l) => /withdrawn rather than deleted/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("release-list: the toggles include the ones it hides", async () => {
  const { ctx } = mockCtx([fleet, releases]);
  const result = await action.execute(
    { fleet: "acme/sensors", includeUnsuccessful: true, includeInvalidated: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.count, 4);
  assertEquals((result.latest as { id: number }).id, 903, "the newest is a build still running");
});

Deno.test("release-list: requires a fleet, and refuses an unknown one", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`fleet` is required");
  assertEquals(calls.length, 0);

  const missing = mockCtx([{ status: 200, body: { d: [] } }]);
  await assertRejects(
    async () => await action.execute({ fleet: "acme/nope" }, missing.ctx),
    Error,
    "no fleet matched",
  );
});

Deno.test("release-list: the limit is clamped", async () => {
  const { ctx, calls } = mockCtx([fleet, { status: 200, body: { d: [] } }]);
  await action.execute({ fleet: "acme/sensors", limit: 5000 }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("$top"), "200");
});
