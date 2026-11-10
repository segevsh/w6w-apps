import { snapshotTrigger } from "../lib/triggers.ts";
import courseList from "../actions/course-list.ts";

interface Course {
  id?: number;
  name?: string;
  heading?: string;
  is_published?: boolean;
}

// Teachable: GET /v1/courses has no sort or created-since filter (only `created_at` equality, `name`,
// `is_published`, `author_bio_id`) and pages with `page`/`per` plus `meta.number_of_pages`
// (https://docs.teachable.com/reference/listcourses, verified 2026-11-10). A school's course
// catalogue is a small bounded collection, so every check reads all pages and diffs the ids
// (snapshot, brief 9.1 c); the first check seeds and emits nothing.
export default snapshotTrigger<Course>({
  key: "new-course",
  title: "New Course",
  description: "The run gets each course newly added to the school.",
  async fetchPage(page, ctx) {
    const res = await courseList.execute({ page, per: 20 }, ctx) as {
      courses?: Course[];
      meta?: { number_of_pages?: number };
    };
    return { items: res.courses ?? [], pages: res.meta?.number_of_pages };
  },
  idOf: (c) => String(c.id ?? ""),
  output: [
    { key: "id", type: "number", label: "Course ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "heading", type: "string", label: "Heading" },
    { key: "description", type: "string", label: "Description" },
    { key: "is_published", type: "boolean", label: "Published" },
    { key: "image_url", type: "string", label: "Image URL" },
  ],
  sample: {
    id: 12,
    name: "Intro to Sourdough",
    heading: "Bake your first loaf",
    description: "A beginner course.",
    is_published: true,
    image_url: "https://example.com/course.png",
  },
});
