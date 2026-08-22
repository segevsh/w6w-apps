import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/offer-list.ts";

const page = (results: unknown[], extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { success: true, results, moreDataAvailable: false, ...extra },
});

/**
 * An offer carries three independent statuses; reading one for another is the
 * usual cause of a report claiming hires that never happened.
 */
Deno.test("offer-list: exposes all three statuses as separate filters", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "o1" }])]);
  await action.execute!({
    offerStatus: "Sent",
    acceptanceStatus: "Pending",
    approvalStatus: "Approved",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.offerStatus, ["Sent"]);
  assertEquals(body.acceptanceStatus, ["Pending"]);
  assertEquals(body.approvalStatus, ["Approved"]);
});

Deno.test("offer-list: blank filters send nothing", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), { limit: 100 });
});

Deno.test("offer-list: returns the sync token from a completed walk", async () => {
  const { ctx } = mockCtx([page([{ id: "o1" }], { syncToken: "Rld2D" })]);
  const result = await action.execute!({ returnAll: true }, ctx) as { syncToken: string };
  assertEquals(result.syncToken, "Rld2D");
});

/** An offer carries somebody's compensation. */
Deno.test("offer-list: logs a count and nothing else", async () => {
  const { ctx, logs } = mockCtx([page([{ id: "o1", salary: 120000 }])]);
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("120000"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1 });
});

Deno.test("offer-list: names the three statuses in its description", () => {
  assert(/INDEPENDENT statuses/.test(action.description!), action.description);
});
