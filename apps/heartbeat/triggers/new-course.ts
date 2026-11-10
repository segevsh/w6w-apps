import { snapshotTrigger } from "../lib/triggers.ts";
import listCourses from "../actions/list-courses.ts";

/**
 * `GET /v0/courses` returns every course in one unpaged response
 * (https://heartbeat.readme.io/reference/getcourses), one community's own courses (bounded; the kit caps a snapshot at 5000 rows), so each check diffs the
 * ids against the previous one (`pollSnapshot`, added only; the COURSE_COMPLETED webhook is the
 * completion event, this is the creation one).
 */
export default snapshotTrigger({
  key: "new-course",
  title: "New Course",
  description:
    "The run gets each newly created course of the Heartbeat community, with its cohort, module and lesson tree.",
  action: listCourses,
  field: "courses",
  output: [
    { key: "id", type: "string", label: "Course ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "category", type: "string", label: "Category" },
    { key: "cohorts", type: "array", label: "Cohorts, modules and lessons" },
  ],
  sample: {
    id: "7c1d3e52-6d2a-4c58-8f0e-2a9b6f1d3c44",
    name: "Getting started",
    description: "A tour of the community",
    category: "Onboarding",
    cohorts: [],
  },
});
