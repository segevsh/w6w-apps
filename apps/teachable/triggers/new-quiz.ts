import { pollSnapshot } from "../../_shared/poll/mod.ts";
import type { TriggerDefinition } from "@w6w/types";
import quizList from "../actions/quiz-list.ts";

// Teachable: GET /v1/courses/{course_id}/lectures/{lecture_id}/quizzes returns the lecture's
// quiz ids in one unpaged response (https://docs.teachable.com/reference/listquizzes, verified
// 2026-11-10). A lecture holds a few quizzes, so each check diffs the id list (snapshot, brief
// 9.1 c); the course and lecture are the user's pick. The first check seeds and emits nothing.
const trigger: TriggerDefinition<{ courseId: number; lectureId: number }> = {
  key: "new-quiz",
  title: "New Quiz",
  description: "The run gets each quiz newly added to the chosen lecture.",
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
    { key: "lectureId", label: "Lecture ID", type: "number", required: true },
  ],
  minIntervalMs: 300_000,
  output: [
    { key: "quiz_id", type: "number", label: "Quiz ID" },
    { key: "course_id", type: "number", label: "Course ID" },
    { key: "lecture_id", type: "number", label: "Lecture ID" },
  ],
  sample: { quiz_id: 31, course_id: 12, lecture_id: 8 },
  async poll({ state, params }, ctx) {
    const res = await quizList.execute(
      { courseId: params.courseId, lectureId: params.lectureId },
      ctx,
    ) as { quiz_ids?: number[] };
    const ids = [...new Set((res.quiz_ids ?? []).map(String))];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: ids.map((key) => ({ key, values: { id: key } })),
      emit: { added: true, updated: false },
    });
    return {
      events: events.map((e) => ({
        quiz_id: Number(e.key),
        course_id: params.courseId,
        lecture_id: params.lectureId,
      })),
      nextState,
    };
  },
};

export default trigger;
