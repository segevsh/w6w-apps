import type { ActionDefinition } from "@w6w/types";
import { ThinkificClient } from "../lib/client.ts";
import { ISO_DATETIME_HINT } from "../lib/params.ts";

interface Input {
  courseId: number;
  userId: number;
  activatedAt?: string;
  expiryDate?: string;
}

/**
 * `POST /enrollments` — enroll a User in a Course.
 *
 * `activatedAt`: per the vendor's own field description, "If not provided,
 * the Enrollment is a free trial" — free-preview access, not full access. Set
 * it to the current time to grant full access immediately. This is a common
 * point of confusion (an enrollment created without it "succeeds" but the
 * student cannot see the paid content), so the hint below states it plainly
 * rather than only in a schema description nobody reads.
 */
const enrollmentsCreate: ActionDefinition<Input> = {
  key: "enrollments-create",
  type: "perform",
  resource: "enrollments",
  title: "Create Enrollment",
  description: "Enroll a User in a Course.",
  idempotent: false,
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
    { key: "userId", label: "User ID", type: "number", required: true },
    {
      key: "activatedAt",
      label: "Activated at",
      type: "datetime",
      hint: "When full course access begins. Leave empty to create a FREE TRIAL enrollment " +
        "(preview content only) — set this to now to grant full access immediately. " +
        ISO_DATETIME_HINT,
    },
    {
      key: "expiryDate",
      label: "Expiry date",
      type: "datetime",
      hint: "When access should end. Leave empty for an enrollment that never expires. " +
        ISO_DATETIME_HINT,
    },
  ],
  output: [
    { key: "id", type: "number", label: "Enrollment ID" },
    { key: "user_id", type: "number", label: "User ID" },
    { key: "course_id", type: "number", label: "Course ID" },
    { key: "is_free_trial", type: "boolean", label: "Is free trial" },
  ],

  async execute(input, ctx) {
    const body = {
      course_id: input.courseId,
      user_id: input.userId,
      activated_at: input.activatedAt,
      expiry_date: input.expiryDate,
    };
    return await new ThinkificClient(ctx).json("/enrollments", { method: "POST", body });
  },
};

export default enrollmentsCreate;
