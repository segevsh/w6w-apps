import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/person-list.ts";

/** FORMER people still appear; an unfiltered report counts everybody ever. */
Deno.test("person-list: defaults to current employees", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "p1" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://api.vanta.com/v1/people");
  assertEquals(new URL(calls[0].url).searchParams.get("employmentStatus"), "CURRENT");
  assertEquals(result.count, 1);
});

Deno.test("person-list: any employment status sends no filter", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ employmentStatus: "" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("employmentStatus"), null);
});

/**
 * Vanta ignores either task filter on its own, which produces a report that
 * looks filtered and is not.
 */
Deno.test("person-list: refuses one task filter without the other", async () => {
  const onlyStatus = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ taskStatuses: "OVERDUE" }, onlyStatus.ctx),
    Error,
    "must be given together",
  );
  assertEquals(onlyStatus.calls.length, 0);

  const onlyType = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ taskTypes: "SECURITY_TRAINING" }, onlyType.ctx),
    Error,
    "must be given together",
  );
});

Deno.test("person-list: the task pair reaches the wire together", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ taskStatuses: "OVERDUE", taskTypes: "SECURITY_TRAINING" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("taskStatusMatchesAny"), ["OVERDUE"]);
  assertEquals(q.getAll("taskTypeMatchesAny"), ["SECURITY_TRAINING"]);
});

Deno.test("person-list: the rolled-up task filter works on its own", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ tasksSummaryStatuses: "OVERDUE" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.getAll("tasksSummaryStatusMatchesAny"),
    ["OVERDUE"],
  );
});

/** A run log is not the place for a staff roster. */
Deno.test("person-list: logs a count, not the people", async () => {
  const { ctx, logs } = mockCtx([page([{ id: "p1", email: "ada@acme.com" }])], { display });
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("ada@acme.com"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1 });
});

/** The distinction that runs through the whole app. */
Deno.test("person-list: says a person is not a user", () => {
  assert(/NOT the same as Vanta users/.test(action.description!), action.description);
});
