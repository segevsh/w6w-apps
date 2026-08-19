import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/archive-reason-list.ts";

const D = { display: { environment: "production" } };
const reasons = {
  status: 200,
  body: {
    data: [
      { id: "r1", text: "Hired", status: "hired" },
      { id: "r2", text: "Not a fit" },
      { id: "r3", text: "Hired - internal transfer" },
      { id: "r4", text: "Withdrew" },
    ],
  },
};

/** Archiving behaves very differently depending on the reason. */
Deno.test("archive-reason-list: separates hire reasons from rejections", async () => {
  const { ctx, calls } = mockCtx([reasons], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v1/archive_reasons");
  assertEquals(result.hiredReasons, ["Hired", "Hired - internal transfer"]);
  assertEquals(result.rejectionReasons, ["Not a fit", "Withdrew"]);
  assertEquals(result.hiredReasonId, "r1");
});

Deno.test("archive-reason-list: returns a name-to-id map for run-time resolution", async () => {
  const { ctx } = mockCtx([reasons], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals((result.byName as Record<string, string>)["Not a fit"], "r2");
});

/** A reason marked hired by status counts even if the text does not say so. */
Deno.test("archive-reason-list: reads the status as well as the text", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: [{ id: "r9", text: "Offer accepted", status: "hired" }] },
  }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.hiredReasons, ["Offer accepted"]);
});

Deno.test("archive-reason-list: says reasons are account configuration", () => {
  assert(/which reasons count as a HIRE/i.test(action.description!), action.description);
});
