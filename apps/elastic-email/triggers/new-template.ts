import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import templateList from "../actions/template-list.ts";

/** The vendor's documented default page for `GET /v4/templates` (an answer this full is refused). */
const CAP = 500;

/**
 * Small bounded collection: `GET /v4/templates` takes `limit`/`offset` with a default of 500 and no
 * created-since filter or order (Elastic Email v4 OpenAPI); an account holds tens of templates.
 * One request asks for the first 500, the whole set is diffed each check, and if the answer fills
 * the request the check fails with an error naming the cap rather than silently dropping rows.
 * A template has no id: its `Name` is what `GET /v4/templates/{name}` takes, so it keys the diff.
 */
const trigger: TriggerDefinition<{ scopeType?: string }> = {
  key: "new-template",
  title: "New Template",
  description:
    "The run gets each email template newly created in the Elastic Email account (Personal scope by default).",
  params: [{
    key: "scopeType",
    label: "Scope",
    type: "string",
    default: "Personal",
    hint: "Comma-separated: Personal, Global. Empty means Personal.",
  }],
  output: [
    { key: "Name", type: "string", label: "Template name" },
    { key: "Subject", type: "string", label: "Subject" },
    { key: "DateAdded", type: "string", label: "Date added" },
    { key: "TemplateScope", type: "string", label: "Scope" },
    { key: "TemplateType", type: "string", label: "Type" },
  ],
  sample: {
    Name: "Welcome email",
    Subject: "Welcome aboard",
    DateAdded: "2026-11-09T12:00:00Z",
    TemplateScope: "Personal",
    TemplateType: "RawHTML",
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const scopeType = params?.scopeType?.trim() || "Personal";
    const out = await templateList.execute({ scopeType, limit: CAP }, ctx) as {
      items?: Array<{ Name?: unknown }>;
    };
    const templates = Array.isArray(out?.items) ? out.items : [];
    if (templates.length >= CAP) {
      throw new Error(
        `Elastic Email account has ${CAP} or more templates in this scope; the New Template trigger is capped there`,
      );
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: templates.map((template) => ({ key: String(template.Name ?? ""), values: template })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
