import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { buildTaskBody } from "../../lib/task.ts";

test("buildTaskBody: description and dueOn pass through", () => {
  assertEquals(
    buildTaskBody({ description: "Email product details", dueOn: "2014-05-20" }),
    { description: "Email product details", dueOn: "2014-05-20" },
  );
});

test("buildTaskBody: party nests as {id}", () => {
  assertEquals(buildTaskBody({ partyId: 11587 }), { party: { id: 11587 } });
});

test("buildTaskBody: opportunity nests as {id}, independent of party", () => {
  assertEquals(buildTaskBody({ opportunityId: 99 }), { opportunity: { id: 99 } });
});

test("buildTaskBody: owner and category nest as {id}", () => {
  assertEquals(
    buildTaskBody({ ownerId: 1, categoryId: 4 }),
    { owner: { id: 1 }, category: { id: 4 } },
  );
});

test("buildTaskBody: status passes through untouched", () => {
  assertEquals(buildTaskBody({ status: "COMPLETED" }), { status: "COMPLETED" });
});

test("buildTaskBody: blank strings dropped, unset fields omitted entirely", () => {
  assertEquals(buildTaskBody({ description: "", detail: "" }), {});
  assertEquals(buildTaskBody({}), {});
});
