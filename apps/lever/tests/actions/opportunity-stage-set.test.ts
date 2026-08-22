import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/opportunity-stage-set.ts";

const D = { display: { environment: "production" } };
const OPP = "8d49b010-cc6a-4f40-ace5-e86061c677ed";
const STAGE = "00922a60-7c15-422b-b086-f62000824fd7";
const USER = "63dd55b2-a99f-4e7b-985f-22c7bf80ab42";
const at = (stage: string, extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { data: { stage: { id: stage }, ...extra } },
});
const ok = { status: 200, body: {} };

Deno.test("opportunity-stage-set: puts the stage with perform_as", async () => {
  const { ctx, calls } = mockCtx([at("s0"), ok], D);
  const result = await action.execute(
    { opportunityId: OPP, stageId: STAGE, performAs: USER },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[1].method, "PUT");
  assertEquals(new URL(calls[1].url).pathname, `/v1/opportunities/${OPP}/stage`);
  assertEquals(new URL(calls[1].url).searchParams.get("perform_as"), USER);
  assertEquals(JSON.parse(calls[1].body!), { stage: STAGE });
  assertEquals(result.previousStageId, "s0");
  assertEquals(result.changed, true);
});

/** Moving to the stage a candidate is already in should not notify anybody. */
Deno.test("opportunity-stage-set: a no-op writes nothing", async () => {
  const { ctx, calls } = mockCtx([at(STAGE)], D);
  const result = await action.execute(
    { opportunityId: OPP, stageId: STAGE, performAs: USER },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.changed, false);
  assertEquals(calls.length, 1);
});

Deno.test("opportunity-stage-set: moving an archived candidate is called out", async () => {
  const { ctx, logs } = mockCtx([at("s0", { archived: { reason: "r1" } }), ok], D);
  const result = await action.execute(
    { opportunityId: OPP, stageId: STAGE, performAs: USER },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.wasArchived, true);
  assert(
    logs.some((l) => /is how to reopen one/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("opportunity-stage-set: every id must be a UUID", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(
    async () =>
      await action.execute({ opportunityId: OPP, stageId: "Phone Screen", performAs: USER }, ctx),
    Error,
    "must be a UUID",
  );
  await assertRejects(
    async () => await action.execute({ opportunityId: OPP, stageId: STAGE }, ctx),
    Error,
    "attributes every write",
  );
  assertEquals(calls.length, 0);
});

/** Stage ids differ between accounts. */
Deno.test("opportunity-stage-set: says to resolve stage ids at run time", () => {
  assert(/`stage-list` at run time/.test(action.description!), action.description);
});
