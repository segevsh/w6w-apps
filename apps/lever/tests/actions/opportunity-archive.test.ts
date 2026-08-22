import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/opportunity-archive.ts";

const D = { display: { environment: "production" } };
const OPP = "8d49b010-cc6a-4f40-ace5-e86061c677ed";
const USER = "63dd55b2-a99f-4e7b-985f-22c7bf80ab42";
const REASON = "00922a60-7c15-422b-b086-f62000824fd7";
const REQ = "64e9c86b-03e9-42a5-871c-591d77f45609";
const active = { status: 200, body: { data: { archived: null } } };
const archived = { status: 200, body: { data: { archived: { reason: REASON } } } };
const reasons = (text: string) => ({
  status: 200,
  body: { data: [{ id: REASON, text }] },
});
const ok = { status: 200, body: {} };

Deno.test("opportunity-archive: archives with a reason", async () => {
  const { ctx, calls } = mockCtx([active, reasons("Not a fit"), ok], D);
  const result = await action.execute(
    { opportunityId: OPP, reasonId: REASON, performAs: USER },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[2].method, "PUT");
  assertEquals(new URL(calls[2].url).pathname, `/v1/opportunities/${OPP}/archived`);
  assertEquals(JSON.parse(calls[2].body!).reason, REASON);
  assertEquals(result.archived, true);
  assertEquals(result.reasonText, "Not a fit");
  assertEquals(result.countedAsHire, false);
});

/** An empty reason is how Lever unarchives. */
Deno.test("opportunity-archive: no reason reopens the candidate", async () => {
  const { ctx, calls } = mockCtx([archived, ok], D);
  const result = await action.execute({ opportunityId: OPP, performAs: USER }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(JSON.parse(calls[1].body!).reason, null);
  assertEquals(result.archived, false);
  assertEquals(result.unarchived, true);
});

/** A hire reason with a requisition changes headcount reporting. */
Deno.test("opportunity-archive: warns when the archive records a hire", async () => {
  const { ctx, logs } = mockCtx([active, reasons("Hired"), ok], D);
  const result = await action.execute(
    { opportunityId: OPP, reasonId: REASON, performAs: USER, requisitionId: REQ },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.countedAsHire, true);
  assert(
    logs.some((l) => l.level === "warn" && /increments its hire count/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** A requisition with no reason would unarchive while looking like a hire. */
Deno.test("opportunity-archive: refuses a requisition without a reason", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () =>
      await action.execute({ opportunityId: OPP, performAs: USER, requisitionId: REQ }, ctx),
    Error,
  );
  assert(/appearing to record a hire/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("opportunity-archive: cancelling interviews is passed through and noted", async () => {
  const { ctx, calls, logs } = mockCtx([active, reasons("Not a fit"), ok], D);
  await action.execute(
    { opportunityId: OPP, reasonId: REASON, performAs: USER, cleanInterviews: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[2].body!).cleanInterviews, true);
  assert(
    logs.some((l) => /cancels events in people's calendars/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("opportunity-archive: requires performAs", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ opportunityId: OPP, reasonId: REASON }, ctx),
    Error,
    "attributes every write",
  );
});
