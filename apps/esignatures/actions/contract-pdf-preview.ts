import type { ActionDefinition } from "@w6w/types";
import { encodeId, ESignaturesClient } from "../lib/client.ts";
import { contractIdParam } from "../lib/params.ts";

/** `POST /api/contracts/{id}/generate_pdf_preview` */
interface Input {
  contractId: string;
}

const action: ActionDefinition<Input> = {
  key: "contract-pdf-preview",
  type: "perform",
  resource: "contract",
  title: "Generate Contract PDF Preview",
  description:
    "Queue a PDF preview of the contract. The URL is delivered asynchronously by a contract-pdf-generated webhook, not in this response.",
  idempotent: false,
  params: [contractIdParam],
  output: [{ key: "status", type: "string", label: "Vendor status" }],

  execute(input, ctx) {
    return new ESignaturesClient(ctx).status(
      `/contracts/${encodeId(input.contractId)}/generate_pdf_preview`,
      {
        method: "POST",
      },
    );
  },
};

export default action;
