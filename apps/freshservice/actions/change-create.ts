import type { ActionDefinition } from "@w6w/types";
import { customFields, FreshserviceClient, unset } from "../lib/client.ts";
import {
  changeRiskOptions,
  changeStatusOptions,
  changeTypeOptions,
  impactOptions,
  priorityOptions,
  workspaceId,
} from "../lib/params.ts";

interface Input {
  subject: string;
  description: string;
  requesterEmail?: string;
  requesterId?: number;
  priority: number;
  status: number;
  impact: number;
  risk: number;
  changeType: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  agentId?: number;
  groupId?: number;
  departmentId?: number;
  workspaceId?: number;
  customFields?: unknown;
}

const changeCreate: ActionDefinition<Input> = {
  key: "change-create",
  type: "perform",
  resource: "change",
  title: "Create Change",
  description: "Raise a change request.",
  // A new change id per call; nothing to converge a retry on.
  idempotent: false,
  params: [
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "description",
      label: "Description",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "HTML content of the change.",
    },
    {
      key: "requesterEmail",
      label: "Requester email",
      type: "string",
      row: "requester",
      hint: "The change's initiator.",
    },
    { key: "requesterId", label: "Requester ID", type: "number", row: "requester" },
    // Freshservice marks priority, status, impact, risk and change_type
    // mandatory on this endpoint.
    {
      key: "priority",
      label: "Priority",
      type: "select",
      required: true,
      default: 1,
      row: "grade",
      options: priorityOptions,
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      default: 1,
      row: "grade",
      options: changeStatusOptions,
    },
    {
      key: "impact",
      label: "Impact",
      type: "select",
      required: true,
      default: 1,
      row: "risk",
      options: impactOptions,
    },
    {
      key: "risk",
      label: "Risk",
      type: "select",
      required: true,
      default: 1,
      row: "risk",
      options: changeRiskOptions,
    },
    {
      key: "changeType",
      label: "Change type",
      type: "select",
      required: true,
      default: 1,
      options: changeTypeOptions,
    },
    { key: "plannedStartDate", label: "Planned start", type: "datetime", row: "window" },
    { key: "plannedEndDate", label: "Planned end", type: "datetime", row: "window" },
    { key: "agentId", label: "Agent ID", type: "number", row: "route" },
    { key: "groupId", label: "Group ID", type: "number", row: "route" },
    { key: "departmentId", label: "Department ID", type: "number", advanced: true },
    workspaceId,
    { key: "customFields", label: "Custom fields", type: "json", advanced: true },
  ],
  output: [
    { key: "id", type: "number", label: "Change ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new FreshserviceClient(ctx).resource("change", "/changes", {
      method: "POST",
      body: {
        subject: input.subject,
        description: input.description,
        email: unset(input.requesterEmail),
        requester_id: input.requesterId,
        priority: input.priority,
        status: input.status,
        impact: input.impact,
        risk: input.risk,
        change_type: input.changeType,
        planned_start_date: unset(input.plannedStartDate),
        planned_end_date: unset(input.plannedEndDate),
        agent_id: input.agentId,
        group_id: input.groupId,
        department_id: input.departmentId,
        workspace_id: input.workspaceId,
        custom_fields: customFields(input.customFields),
      },
    });
  },
};

export default changeCreate;
