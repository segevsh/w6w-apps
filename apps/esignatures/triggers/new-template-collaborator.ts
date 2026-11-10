import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import collaboratorList from "../actions/collaborator-list.ts";
import { templateIdParam } from "../lib/params.ts";

/**
 * Per-template snapshot: `GET /api/templates/{id}/collaborators` answers every collaborator of
 * one template in one response and takes no paging, filter or order (eSignatures.com API
 * reference, Collaborators, List); a template has a handful. The collaborator's
 * `template_collaborator_editor_url` is a standalone link into the template editor, so it is
 * dropped from the emitted record (it is a credential-bearing URL and never reaches run history).
 */
const trigger: TriggerDefinition<{ templateId: string }> = {
  key: "new-template-collaborator",
  title: "New Template Collaborator",
  description:
    "The run gets each collaborator newly added to the chosen template. The editor link is not included.",
  params: [templateIdParam],
  output: [
    { key: "template_collaborator_id", type: "string", label: "Collaborator ID" },
    { key: "template_id", type: "string", label: "Template ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: {
    template_collaborator_id: "5templcoll5-7777",
    template_id: "4templ44-8888",
    name: "Chris Colleague",
    email: "chris@acme.com",
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const templateId = params?.templateId?.trim();
    if (!templateId) throw new Error("Template ID is required");
    const out = await collaboratorList.execute({ templateId }, ctx) as {
      collaborators?: Array<Record<string, unknown>>;
    };
    const collaborators = Array.isArray(out?.collaborators) ? out.collaborators : [];
    const rows = collaborators.map((c) => {
      const { template_collaborator_editor_url: _editorUrl, ...safe } = c;
      return { key: String(safe.template_collaborator_id ?? ""), values: safe };
    });
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
