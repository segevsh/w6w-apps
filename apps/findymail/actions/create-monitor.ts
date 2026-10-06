import type { ActionDefinition } from "@w6w/types";
import { compact, FindymailClient, jsonValue, strList } from "../lib/client.ts";

interface Input {
  name: string;
  signal_type: string;
  post_url?: string;
  profile_url?: string;
  keywords?: string;
  webhook_url?: string;
  engagement_types?: string[] | string;
  enrichment_level?: string;
  lead_list_id?: number;
  ai_relevance_prompt?: string;
  target_companies?: string;
  is_shared?: boolean;
  icp_filters?: unknown;
  job_offer_title_keywords?: string;
}

const createMonitor: ActionDefinition<Input> = {
  key: "create-monitor",
  type: "perform",
  resource: "monitor",
  title: "Create Monitor",
  description: "Create a signal monitor. The signal type cannot be changed afterwards.",
  idempotent: false,
  params: [
    { "key": "name", "label": "Name", "type": "string", "required": true },
    {
      "key": "signal_type",
      "label": "Signal type",
      "type": "select",
      "required": true,
      "options": [
        { "value": "keyword_mention", "label": "keyword_mention" },
        { "value": "new_hire", "label": "new_hire" },
        { "value": "job_change", "label": "job_change" },
        { "value": "post_engagement", "label": "post_engagement" },
        { "value": "company_hiring", "label": "company_hiring" },
      ],
    },
    {
      "key": "post_url",
      "label": "LinkedIn post URL",
      "type": "string",
      "hint": "post_engagement only.",
    },
    {
      "key": "profile_url",
      "label": "LinkedIn profile URL",
      "type": "string",
      "hint": "post_engagement only; alternative to a post URL.",
    },
    {
      "key": "keywords",
      "label": "Keywords",
      "type": "string",
      "hint": "Comma-separated, max 5. Required for keyword_mention.",
    },
    {
      "key": "webhook_url",
      "label": "Webhook URL",
      "type": "string",
      "hint": "HTTPS URL notified when a signal matches.",
    },
    {
      "key": "engagement_types",
      "label": "Engagement types",
      "type": "multiselect",
      "hint": "Required for post_engagement.",
      "options": [{ "value": "like", "label": "Like" }, { "value": "comment", "label": "Comment" }],
    },
    {
      "key": "enrichment_level",
      "label": "Enrichment level",
      "type": "select",
      "options": [{ "value": "email", "label": "Email" }, {
        "value": "email_phone",
        "label": "Email and phone",
      }],
    },
    {
      "key": "lead_list_id",
      "label": "Lead list ID",
      "type": "number",
      "hint": "Matched contacts are added to this list.",
    },
    {
      "key": "ai_relevance_prompt",
      "label": "AI relevance prompt",
      "type": "text",
      "hint": "Max 500 characters.",
    },
    {
      "key": "target_companies",
      "label": "Target companies",
      "type": "string",
      "hint": "Comma-separated names or domains, max 100. Only for new_hire and job_change.",
    },
    { "key": "is_shared", "label": "Share with team", "type": "boolean" },
    {
      "key": "icp_filters",
      "label": "ICP filters",
      "type": "json",
      "hint":
        "Object with optional industries, employee_count_ranges, countries (ISO-2), job_title_keywords (max 10) and seniority_levels.",
    },
    {
      "key": "job_offer_title_keywords",
      "label": "Job offer title keywords",
      "type": "string",
      "hint": "Comma-separated, max 10. Required for company_hiring, rejected otherwise.",
    },
  ],
  output: [
    { "key": "id", "type": "number", "label": "Monitor ID" },
    { "key": "name", "type": "string", "label": "Name" },
    { "key": "signal_type", "type": "string", "label": "Signal type" },
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "keywords", "type": "array", "label": "Keywords" },
    { "key": "icp_filters", "type": "object", "label": "ICP filters" },
    { "key": "webhook_url", "type": "string", "label": "Webhook URL" },
    { "key": "enrichment_level", "type": "string", "label": "Enrichment level" },
    { "key": "lead_list_id", "type": "number", "label": "Lead list ID" },
  ],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request("POST", "/api/signals/monitors", {
      body: compact({
        name: input.name,
        signal_type: input.signal_type,
        post_url: input.post_url,
        profile_url: input.profile_url,
        keywords: strList(input.keywords),
        webhook_url: input.webhook_url,
        engagement_types: strList(input.engagement_types),
        enrichment_level: input.enrichment_level,
        lead_list_id: input.lead_list_id,
        ai_relevance_prompt: input.ai_relevance_prompt,
        target_companies: strList(input.target_companies),
        is_shared: input.is_shared,
        icp_filters: jsonValue(input.icp_filters),
        job_offer_title_keywords: strList(input.job_offer_title_keywords),
      }),
    });
  },
};

export default createMonitor;
