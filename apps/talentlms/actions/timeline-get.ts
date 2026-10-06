import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  eventType: string;
  userId?: number;
  courseId?: number;
  branchId?: number;
  groupId?: number;
  unitId?: number;
}

const timelineGet: ActionDefinition<Input> = {
  key: "timeline-get",
  type: "read",
  resource: "domain",
  title: "Get Timeline",
  description:
    "The latest 200 timeline entries for an event type, optionally narrowed to one entity.",
  params: [
    {
      key: "eventType",
      label: "Event type",
      type: "select",
      required: true,
      options: [
        { value: "user_login_user", label: "User log in" },
        { value: "user_register_user", label: "User registration" },
        { value: "user_self_register", label: "User self registration" },
        { value: "user_delete_user", label: "User deletion" },
        { value: "user_undelete_user", label: "Undelete user" },
        { value: "user_property_change", label: "User update" },
        { value: "user_create_payment", label: "User payment" },
        { value: "user_upgrade_level", label: "User level" },
        { value: "user_unlock_badge", label: "User badge" },
        { value: "course_create_course", label: "Course creation" },
        { value: "course_delete_course", label: "Course deletion" },
        { value: "course_undelete_course", label: "Undelete course" },
        { value: "course_property_change", label: "Course update" },
        { value: "course_add_user", label: "Added user to course" },
        { value: "course_remove_user", label: "Removed user from course" },
        { value: "course_completion", label: "User completed course" },
        { value: "course_failure", label: "User did not pass course" },
        { value: "course_reset_user_progress", label: "Reset progress" },
        { value: "branch_create_branch", label: "Branch creation" },
        { value: "branch_delete_branch", label: "Branch deletion" },
        { value: "branch_property_change", label: "Branch update" },
        { value: "branch_add_user", label: "Added user to branch" },
        { value: "branch_remove_user", label: "Removed user from branch" },
        { value: "branch_add_course", label: "Added course to branch" },
        { value: "branch_remove_course", label: "Removed course from branch" },
        { value: "group_create_group", label: "Group creation" },
        { value: "group_delete_group", label: "Group deletion" },
        { value: "group_property_change", label: "Group update" },
        { value: "group_add_user", label: "Added user to group" },
        { value: "group_remove_user", label: "Removed user from group" },
        { value: "group_add_course", label: "Added course to group" },
        { value: "group_remove_course", label: "Removed course from group" },
        { value: "certification_issue_certification", label: "Certification issued to user" },
        { value: "certification_refresh_certification", label: "Certification renewed" },
        { value: "certification_remove_certification", label: "Certification removed" },
        { value: "certification_expire_certification", label: "Certification expired" },
        { value: "unitprogress_test_completion", label: "Test completion" },
        { value: "unitprogress_test_failed", label: "Test fail" },
        { value: "unitprogress_survey_completion", label: "Survey completion" },
        { value: "unitprogress_assignment_answered", label: "Assignment submission" },
        { value: "unitprogress_assignment_graded", label: "Assignment grading" },
        { value: "unitprogress_ilt_graded", label: "ILT grading" },
        { value: "notification_create_notification", label: "Notification creation" },
        { value: "notification_delete_notification", label: "Notification deletion" },
        { value: "notification_update_notification", label: "Notification update" },
        { value: "automation_create_automation", label: "Automation creation" },
        { value: "automation_delete_automation", label: "Automation deletion" },
        { value: "automation_update_automation", label: "Automation update" },
        { value: "reports_create_custom_report", label: "Custom report creation" },
        { value: "reports_delete_custom_report", label: "Custom report deletion" },
        { value: "reports_update_custom_report", label: "Custom report update" },
      ],
    },
    { key: "userId", label: "User ID", type: "number" },
    { key: "courseId", label: "Course ID", type: "number", advanced: true },
    { key: "branchId", label: "Branch ID", type: "number", advanced: true },
    { key: "groupId", label: "Group ID", type: "number", advanced: true },
    { key: "unitId", label: "Unit ID", type: "number", advanced: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("gettimeline", {
      event_type: input.eventType,
      user_id: input.userId,
      course_id: input.courseId,
      branch_id: input.branchId,
      group_id: input.groupId,
      unit_id: input.unitId,
    });
  },
};

export default timelineGet;
