import type { ActionDefinition } from "@w6w/types";
import { asJson, compact, encodeId, ESignaturesClient, yesNo } from "../lib/client.ts";
import { contractIdParam, dryRunParam, editsParam } from "../lib/params.ts";

/**
 * `POST /api/contracts/{id}/content` — find-and-replace edits on the contract's markdown.
 *
 * `find_markdown` matches literally. Use Dry run to preview. Not idempotent: replaying an edit
 * whose find text was already replaced fails or matches something new.
 */
interface Input {
  contractId: string;
  edits: unknown;
  dryRun?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "contract-content-update",
  type: "perform",
  resource: "contract",
  title: "Update Contract Content",
  description:
    "Apply find-and-replace markdown edits to an unsigned contract and return the updated markdown.",
  idempotent: false,
  params: [contractIdParam, editsParam, dryRunParam],
  output: [
    { key: "status", type: "string", label: "updated" },
    { key: "markdown", type: "string", label: "Resulting markdown" },
  ],

  async execute(input, ctx) {
    const body = compact({ dry_run: yesNo(input.dryRun), edits: asJson(input.edits, "edits") });
    const res = await new ESignaturesClient(ctx).call(
      `/contracts/${encodeId(input.contractId)}/content`,
      { method: "POST", body },
    );
    return { status: res.status, markdown: (res.data as { markdown?: string })?.markdown };
  },
};

export default action;
