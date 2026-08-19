import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/offer-list.ts";

const D = { display: { environment: "production" } };
const OPP = "8d49b010-cc6a-4f40-ace5-e86061c677ed";
const offers = (latest: Record<string, unknown>) => ({
  status: 200,
  body: { data: [latest, { id: "of0", status: "denied" }] },
});

/** `signed` is acceptance; `approved` is an internal decision. */
Deno.test("offer-list: distinguishes acceptance from internal approval", async () => {
  const accepted = mockCtx([offers({ id: "of1", status: "signed", signedAt: 1 })], D);
  const signed = await action.execute({ opportunityId: OPP }, accepted.ctx) as Record<
    string,
    unknown
  >;
  assertEquals(signed.hasSignedOffer, true);
  assertEquals(signed.awaitingApproval, false);

  const internal = mockCtx([offers({ id: "of1", status: "approved" })], D);
  const pending = await action.execute({ opportunityId: OPP }, internal.ctx) as Record<
    string,
    unknown
  >;
  assertEquals(pending.hasSignedOffer, false);
  assertEquals(pending.awaitingApproval, true, "approved is not accepted");
});

/** Sent and unsigned is the state with a clock on it. */
Deno.test("offer-list: counts the days an offer has been outstanding, and flags a week", async () => {
  const week = Date.now() - 9 * 86_400_000;
  const { ctx, logs } = mockCtx([offers({ id: "of1", status: "sent", sentAt: week })], D);
  const result = await action.execute({ opportunityId: OPP }, ctx) as Record<string, unknown>;
  assertEquals(result.awaitingCandidate, true);
  assertEquals(result.daysOutstanding, 9);
  assert(
    logs.some((l) => /a conversation somebody should be having/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("offer-list: a fresh offer is not flagged", async () => {
  const { ctx, logs } = mockCtx([
    offers({ id: "of1", status: "sent", sentAt: Date.now() - 86_400_000 }),
  ], D);
  const result = await action.execute({ opportunityId: OPP }, ctx) as Record<string, unknown>;
  assertEquals(result.daysOutstanding, 1);
  assert(!logs.some((l) => /conversation somebody/.test(l.message)));
});

/** Offer fields carry compensation about a named person. */
Deno.test("offer-list: logs counts, never the offer fields", async () => {
  const { ctx, logs } = mockCtx([
    offers({ id: "of1", status: "signed", fields: [{ text: "Salary", value: "120000" }] }),
  ], D);
  await action.execute({ opportunityId: OPP }, ctx);
  assert(!/120000/.test(JSON.stringify(logs)), JSON.stringify(logs));
});

Deno.test("offer-list: requires a UUID", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ opportunityId: "abc" }, ctx),
    Error,
    "must be a UUID",
  );
});
