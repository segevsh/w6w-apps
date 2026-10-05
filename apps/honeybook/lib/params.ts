import type { Param } from "@w6w/types";

export const contactIncludeParams: Param[] = [
  {
    key: "include",
    label: "Include",
    type: "multiselect",
    hint: "Relations to populate in the response. A relation not requested comes back null.",
    options: [
      { "value": "user", "label": "User" },
      { "value": "action_suggestions", "label": "Action suggestions" },
      { "value": "workspaces", "label": "Workspaces" },
      { "value": "tags", "label": "Tags" },
      { "value": "client_organization", "label": "Client organization" },
      { "value": "custom_fields", "label": "Custom fields" },
      { "value": "enrichment", "label": "Enrichment" },
    ],
  },
  {
    key: "maxActionSuggestions",
    label: "Max action suggestions",
    type: "number",
    hint: "Cap on how many of that relation are embedded.",
  },
  {
    key: "maxWorkspaces",
    label: "Max workspaces",
    type: "number",
    hint: "Cap on how many of that relation are embedded.",
  },
  {
    key: "maxTags",
    label: "Max tags",
    type: "number",
    hint: "Cap on how many of that relation are embedded.",
  },
  {
    key: "maxCustomFields",
    label: "Max custom fields",
    type: "number",
    hint: "Cap on how many of that relation are embedded.",
  },
];

export const workspaceIncludeParams: Param[] = [
  {
    key: "include",
    label: "Include",
    type: "multiselect",
    hint: "Relations to populate in the response. A relation not requested comes back null.",
    options: [
      { "value": "creator", "label": "Creator" },
      { "value": "pipeline_stage", "label": "Pipeline stage" },
      { "value": "automations", "label": "Automations" },
      { "value": "action_suggestions", "label": "Action suggestions" },
      { "value": "scheduled_sessions", "label": "Scheduled sessions" },
    ],
  },
  {
    key: "maxActionSuggestions",
    label: "Max action suggestions",
    type: "number",
    hint: "Cap on how many of that relation are embedded.",
  },
  {
    key: "maxScheduledSessions",
    label: "Max scheduled sessions",
    type: "number",
    hint: "Cap on how many of that relation are embedded.",
  },
];

export const projectIncludeParams: Param[] = [
  {
    key: "include",
    label: "Include",
    type: "multiselect",
    hint: "Relations to populate in the response. A relation not requested comes back null.",
    options: [{ "value": "workspaces", "label": "Workspaces" }, {
      "value": "custom_fields",
      "label": "Custom fields",
    }, { "value": "cover_image", "label": "Cover image" }],
  },
  {
    key: "maxWorkspaces",
    label: "Max workspaces",
    type: "number",
    hint: "Cap on how many of that relation are embedded.",
  },
  {
    key: "maxCustomFields",
    label: "Max custom fields",
    type: "number",
    hint: "Cap on how many of that relation are embedded.",
  },
];

export const memberIncludeParams: Param[] = [
  {
    key: "include",
    label: "Include",
    type: "multiselect",
    hint: "Relations to populate in the response. A relation not requested comes back null.",
    options: [{ "value": "user", "label": "User" }, { "value": "contact", "label": "Contact" }],
  },
];
