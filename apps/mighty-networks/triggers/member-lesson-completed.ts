import { webhookTrigger } from "../lib/triggers.ts";

/** Lesson Completed (the `MemberLessonCompleted` webhook event). */
const memberLessonCompleted = webhookTrigger({
  key: "member-lesson-completed",
  title: "Lesson Completed",
  description:
    "Fires when a member completes a lesson in a course. The run gets the event id and time and the payload: the member, the course (id, name), the lesson (id, title, status) and the completion time.",
  eventTypes: ["MemberLessonCompleted"],
  sample: {
    eventId: "sample-event-id",
    eventType: "MemberLessonCompleted",
    eventTimestamp: "2026-11-10T10:30:00Z",
    payload: {
      member: {
        id: 67890,
        email: "ada@example.com",
        first_name: "Ada",
        last_name: "Lovelace",
        member_type: "member",
      },
      course: { id: 111, name: "Intro course" },
      lesson: { id: 888, space_id: 111, type: "lesson", title: "Lesson 1", status: "posted" },
      completed_at: "2026-11-10T10:30:00Z",
    },
  },
});

export default memberLessonCompleted;
