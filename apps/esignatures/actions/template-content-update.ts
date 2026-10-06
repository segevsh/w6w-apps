import type { ActionDefinition } from "@w6w/types";
import { asJson, compact, encodeId, ESignaturesClient, yesNo } from "../lib/client.ts";
import { dryRunParam, editsParam, templateIdParam } from "../lib/params.ts";

/**
 * `POST /api/templates/{id}/content` — find-and-replace edits on the template's markdown.
 *
 * `find_markdown` matches literally. Use Dry run to preview. Not idempotent: replaying an edit
 * whose find text was already replaced fails or matches something new.
 */
interface Input {
  templateId: string;
  edits: unknown;
  dryRun?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "template-content-update",
  type: "perform",
  resource: "template",
  title: "Update Template Content",
  description:
    "Apply find-and-replace markdown edits to a template and return the updated markdown.",
  idempotent: false,
  params: [templateIdParam, editsParam, dryRunParam],
  output: [
    { key: "status", type: "string", label: "updated" },
    { key: "markdown", type: "string", label: "Resulting markdown" },
  ],

  async execute(input, ctx) {
    const body = compact({ dry_run: yesNo(input.dryRun), edits: asJson(input.edits, "edits") });
    const res = await new ESignaturesClient(ctx).call(
      `/templates/${encodeId(input.templateId)}/content`,
      { method: "POST", body },
    );
    return { status: res.status, markdown: (res.data as { markdown?: string })?.markdown };
  },
};

export default action;
