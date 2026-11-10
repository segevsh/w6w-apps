import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx, paginationMeta, pathOf, queryOf } from "../_helpers.ts";
import newCourse from "../../triggers/new-course.ts";
import newPricingPlan from "../../triggers/new-pricing-plan.ts";
import newEnrollment from "../../triggers/new-enrollment.ts";
import newQuiz from "../../triggers/new-quiz.ts";

const base = { subscriptionId: "sub-1" };

const pageBody = (key: string, items: unknown[], page: number, pages: number) => ({
  ...envelope(key, items),
  meta: paginationMeta({ page, number_of_pages: pages }),
});

describe("new-course (snapshot)", () => {
  const params = {};
  test("first check seeds, emits nothing and sends the literal request", async () => {
    const m = mockCtx([{ body: pageBody("courses", [{ id: 1 }], 1, 1) }]);
    const r = await newCourse.poll!({ ...base, params, state: {} }, m.ctx);
    assertEquals(r.events, []);
    assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(pathOf(m.calls[0].url), "/v1/courses");
    assertEquals(queryOf(m.calls[0].url), { page: "1", per: "20" });
  });

  test("a new course is emitted, reading every page, and a retry is identical", async () => {
    const seeded = await newCourse.poll!(
      { ...base, params, state: {} },
      mockCtx([{ body: pageBody("courses", [{ id: 1 }], 1, 1) }]).ctx,
    );
    const responses = () => [
      { body: pageBody("courses", [{ id: 1 }], 1, 2) },
      { body: pageBody("courses", [{ id: 2, name: "New" }], 2, 2) },
    ];
    const m = mockCtx(responses());
    const next = await newCourse.poll!({ ...base, params, state: seeded.nextState }, m.ctx);
    assertEquals(next.events, [{ id: 2, name: "New" }]);
    assertEquals(queryOf(m.calls[1].url), { page: "2", per: "20" });
    const again = await newCourse.poll!(
      { ...base, params, state: seeded.nextState },
      mockCtx(responses()).ctx,
    );
    assertEquals(again, next);
  });
});

describe("new-pricing-plan (snapshot)", () => {
  const params = {};
  test("seeds, then emits only the added plan", async () => {
    const m = mockCtx([{ body: pageBody("pricing_plans", [{ id: 1 }], 1, 1) }]);
    const seeded = await newPricingPlan.poll!({ ...base, params, state: {} }, m.ctx);
    assertEquals(seeded.events, []);
    assertEquals(pathOf(m.calls[0].url), "/v1/pricing_plans");
    assertEquals(queryOf(m.calls[0].url), { page: "1", per: "5" });
    const responses = () => [{
      body: pageBody("pricing_plans", [{ id: 1 }, { id: 9, name: "Annual" }], 1, 1),
    }];
    const next = await newPricingPlan.poll!(
      { ...base, params, state: seeded.nextState },
      mockCtx(responses()).ctx,
    );
    assertEquals(next.events, [{ id: 9, name: "Annual" }]);
    const again = await newPricingPlan.poll!(
      { ...base, params, state: seeded.nextState },
      mockCtx(responses()).ctx,
    );
    assertEquals(again, next);
  });
});

describe("new-enrollment (newest first)", () => {
  const params = { courseId: 7 };
  const row = (user_id: number, enrolled_at: string) => ({ user_id, enrolled_at });
  test("seeds, sends sort_direction=desc, emits the new enrollment, retries identically", async () => {
    const m = mockCtx([{ body: envelope("enrollments", [row(1, "2026-11-01T00:00:00Z")]) }]);
    const seeded = await newEnrollment.poll!({ ...base, params, state: {} }, m.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(pathOf(m.calls[0].url), "/v1/courses/7/enrollments");
    assertEquals(queryOf(m.calls[0].url), { sort_direction: "desc" });
    const fresh = row(2, "2026-11-09T00:00:00Z");
    const responses = () => [{
      body: envelope("enrollments", [fresh, row(1, "2026-11-01T00:00:00Z")]),
    }];
    const next = await newEnrollment.poll!(
      { ...base, params, state: seeded.nextState },
      mockCtx(responses()).ctx,
    );
    assertEquals(next.events, [fresh]);
    const again = await newEnrollment.poll!(
      { ...base, params, state: seeded.nextState },
      mockCtx(responses()).ctx,
    );
    assertEquals(again, next);
  });
});

describe("new-quiz (snapshot)", () => {
  const params = { courseId: 12, lectureId: 8 };
  test("seeds, requests the lecture's quizzes, emits only the added quiz id", async () => {
    const m = mockCtx([{ body: { quiz_ids: [1] } }]);
    const seeded = await newQuiz.poll!({ ...base, params, state: {} }, m.ctx);
    assertEquals(seeded.events, []);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(pathOf(m.calls[0].url), "/v1/courses/12/lectures/8/quizzes");
    const responses = () => [{ body: { quiz_ids: [1, 5] } }];
    const next = await newQuiz.poll!(
      { ...base, params, state: seeded.nextState },
      mockCtx(responses()).ctx,
    );
    assertEquals(next.events, [{ quiz_id: 5, course_id: 12, lecture_id: 8 }]);
    const again = await newQuiz.poll!(
      { ...base, params, state: seeded.nextState },
      mockCtx(responses()).ctx,
    );
    assertEquals(again, next);
  });
});
