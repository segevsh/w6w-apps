import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Ironclad actions. Every name, bound and enum is copied from the
 * OpenAPI document embedded in `developer.ironcladapp.com/reference/*.md` (read 2026-10-06).
 */

/** Zero-based `page` + `pageSize` (1-100, default 20) — the pagination every list endpoint shares. */
export const pageParams: Param[] = [
  {
    key: "page",
    label: "Page",
    type: "number",
    default: 0,
    validation: { min: 0, integer: true },
    hint: "Zero-based page number. The response's `count` is the total across all pages.",
  },
  {
    key: "pageSize",
    label: "Page size",
    type: "number",
    default: 20,
    validation: { min: 1, max: 100, integer: true },
    hint: "Items per page, 1-100.",
  },
];

export const filterParam: Param = {
  key: "filter",
  label: "Filter",
  type: "string",
  placeholder: "Contains([counterpartyName], 'Acme')",
  hint: "Ironclad filter formula: property ids in square brackets, string values quoted. " +
    "Operations include Equals, NotEqual, Contains, IsEmpty, IsNotEmpty, LessThan, GreaterThan.",
};

export const searchParam: Param = {
  key: "search",
  label: "Search",
  type: "string",
  validation: { maxLength: 1000 },
  hint: "Free-text search, combined with the filter by logical AND. Maximum 1000 characters.",
};

export const hydrateEntitiesParam: Param = {
  key: "hydrateEntities",
  label: "Hydrate entities",
  type: "boolean",
  default: false,
  hint: "Return related entities in full instead of minimal references.",
};

export const workflowIdParam: Param = {
  key: "workflowId",
  label: "Workflow ID",
  type: "string",
  required: true,
  hint: "The workflow's `id` (or Ironclad ID) from a workflow list or launch response.",
};

export const recordIdParam: Param = {
  key: "recordId",
  label: "Record ID",
  type: "string",
  required: true,
  hint: "The record's `id` or Ironclad ID.",
};

export const entityIdParam: Param = {
  key: "entityId",
  label: "Entity ID",
  type: "string",
  required: true,
};

export const webhookIdParam: Param = {
  key: "webhookId",
  label: "Webhook ID",
  type: "string",
  required: true,
};

/** The comment object the cancel/pause/resume endpoints require (`comment.message` is required). */
export const stateChangeParams: Param[] = [
  workflowIdParam,
  {
    key: "message",
    label: "Comment",
    type: "text",
    required: true,
    hint: "Posted to the workflow's activity feed. Ironclad requires it on cancel, pause and " +
      "resume.",
  },
  {
    key: "addUsersToWorkflow",
    label: "Add mentioned users to the workflow",
    type: "boolean",
    default: false,
  },
];

/** Webhook event names, from the `WebhookEvent` enum on `POST /webhooks`. */
export const webhookEventOptions = [
  "*",
  "workflow_launched",
  "workflow_updated",
  "workflow_cancelled",
  "workflow_deleted",
  "workflow_completed",
  "workflow_approval_status_changed",
  "workflow_attribute_updated",
  "workflow_comment_added",
  "workflow_comment_removed",
  "workflow_comment_updated",
  "workflow_comment_reaction_added",
  "workflow_comment_reaction_removed",
  "workflow_counterparty_invite_sent",
  "workflow_counterparty_invite_revoked",
  "workflow_documents_added",
  "workflow_documents_removed",
  "workflow_documents_updated",
  "workflow_documents_renamed",
  "workflow_document_edited",
  "workflow_changed_turn",
  "workflow_paused",
  "workflow_resumed",
  "workflow_signature_packet_cancelled",
  "workflow_signature_packet_document_moved",
  "workflow_signature_packet_fully_signed",
  "workflow_signature_packet_sent",
  "workflow_signature_packet_signatures_collected",
  "workflow_signature_packet_signer_first_viewed",
  "workflow_signature_packet_signer_viewed",
  "workflow_signature_packet_uploaded",
  "workflow_signer_added",
  "workflow_signer_removed",
  "workflow_signer_reassigned",
  "workflow_step_updated",
  "workflow_roles_assigned",
  "record_contract_status_changed",
  "obligation_created",
  "obligation_status_changed",
  "obligation_due_date_changed",
  "obligation_assignee_changed",
  "obligation_updated",
  "obligations_extraction_completed",
].map((value) => ({ value, label: value === "*" ? "* (all events — high volume)" : value }));
