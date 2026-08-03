import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-get-many.ts";

const BODY = {
  page: 1,
  limit: 50,
  hasMore: true,
  totalNumberOfSubmissionsPerFilter: { all: 10, completed: 8, partial: 2 },
  questions: [{ id: "q1", title: "Email" }],
  submissions: [{ id: "s1", isCompleted: true }],
};

Deno.test("submission-get-many: GETs the form's submissions with every filter", async () => {
  const { ctx, calls } = mockCtx([{ body: BODY }]);
  const result = await action.execute({
    formId: "f1",
    page: 1,
    limit: 50,
    filter: "completed",
    startDate: "2026-01-01T00:00:00Z",
    endDate: "2026-02-01T00:00:00Z",
    afterId: "s0",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/forms/f1/submissions");
  assertEquals(url.searchParams.get("filter"), "completed");
  assertEquals(url.searchParams.get("startDate"), "2026-01-01T00:00:00Z");
  assertEquals(url.searchParams.get("endDate"), "2026-02-01T00:00:00Z");
  assertEquals(url.searchParams.get("afterId"), "s0");

  // The submissions endpoint does NOT use the `items` envelope.
  assertEquals(result.submissions, [{ id: "s1", isCompleted: true }]);
  assertEquals(result.questions, [{ id: "q1", title: "Email" }]);
  assertEquals(result.totalNumberOfSubmissionsPerFilter, { all: 10, completed: 8, partial: 2 });
  assertEquals(result.hasMore, true);
});

Deno.test("submission-get-many: omits unset params", async () => {
  const { ctx, calls } = mockCtx([{ body: BODY }]);
  await action.execute({ formId: "f1" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("submission-get-many: offers exactly Tally's three filter values", () => {
  const filter = action.params?.find((p) => p.key === "filter");
  assertEquals(
    (filter?.options as Array<{ value: string }>).map((o) => o.value),
    ["all", "completed", "partial"],
  );
});

Deno.test("submission-get-many: tolerates an empty body", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const result = await action.execute({ formId: "f1" }, ctx);
  assertEquals(result.submissions, []);
  assertEquals(result.questions, []);
});
