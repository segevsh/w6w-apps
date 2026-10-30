import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/note-list.ts";

const D = { display: { environment: "production" } };
const OPP = "8d49b010-cc6a-4f40-ace5-e86061c677ed";
const notes = {
  status: 200,
  body: {
    data: [
      { id: "n1", user: "u1", createdAt: 300, secret: false },
      { id: "n2", user: "u2", createdAt: 200, secret: true },
      { id: "n3", user: "u1", createdAt: 100, deletedAt: 250 },
    ],
  },
};

/** A deleted note is one somebody chose to retract. */
test("note-list: excludes deleted notes and still counts them", async () => {
  const { ctx, calls } = mockCtx([notes], D);
  const result = await action.execute({ opportunityId: OPP }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, `/v1/opportunities/${OPP}/notes`);
  assertEquals(result.count, 2);
  assertEquals(result.deletedCount, 1);
});

test("note-list: includeDeleted returns them", async () => {
  const { ctx } = mockCtx([notes], D);
  const result = await action.execute({ opportunityId: OPP, includeDeleted: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.count, 3);
});

test("note-list: reports the authors and the most recent note", async () => {
  const { ctx } = mockCtx([notes], D);
  const result = await action.execute({ opportunityId: OPP }, ctx) as Record<string, unknown>;
  assertEquals(result.authors, ["u1", "u2"]);
  assertEquals(result.secretCount, 1);
  assertEquals(result.latestAt, 300);
});

test("note-list: requires a UUID", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ opportunityId: "abc" }, ctx),
    Error,
    "must be a UUID",
  );
});

/** An empty result and a filtered one look the same. */
test("note-list: says restricted notes depend on the key", () => {
  assert(/look identical/.test(action.description!), action.description);
});
