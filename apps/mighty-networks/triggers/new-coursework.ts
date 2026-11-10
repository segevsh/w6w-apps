import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import { SNAPSHOT_OUTPUT, snapshotPoll } from "../lib/triggers.ts";
import courseworkList from "../actions/coursework-list.ts";

const SPACE_ID: Param = {
  key: "spaceId",
  label: "Course (space) ID",
  type: "number",
  required: true,
  validation: { integer: true, min: 1 },
  hint: "The course to watch (List Spaces lists them).",
};

/**
 * `GET /spaces/{space_id}/courseworks` (the `coursework-list` action) for one course, read page by
 * page and diffed: one course's lessons, quizzes and sections are a small bounded collection and the
 * Admin API documents no sort order or since filter on the list. The action is called with no
 * `type`, `parent_id` or `status` filter, exactly as a user would run it.
 */
const newCoursework: TriggerDefinition<{ spaceId: number }> = {
  key: "new-coursework",
  title: "New Coursework",
  description:
    "The run gets each lesson, quiz or section newly added to a course (a space): the coursework item (id, type, title, status, parent id, position).",
  params: [SPACE_ID],
  output: SNAPSHOT_OUTPUT as OutputField[],
  sample: {
    change: "added",
    key: "888",
    values: {
      id: 888,
      space_id: 111,
      type: "lesson",
      title: "Lesson 1",
      status: "posted",
      parent_id: null,
      position: 1,
    },
  },
  minIntervalMs: 300_000,
  poll({ state, params }, ctx) {
    const spaceId = Number(params?.spaceId);
    if (!Number.isInteger(spaceId) || spaceId < 1) {
      throw new Error("Choose the course (space) to watch.");
    }
    return snapshotPoll({
      state,
      label: "coursework",
      fetchPage: (page, perPage) => courseworkList.execute({ spaceId, page, perPage }, ctx),
    });
  },
};

export default newCoursework;
