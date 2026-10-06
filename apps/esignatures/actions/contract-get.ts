import type { ActionDefinition } from "@w6w/types";
import { encodeId, ESignaturesClient } from "../lib/client.ts";
import { contractIdParam } from "../lib/params.ts";

/**
 * `GET /api/contracts/{id}` — contract status, signers and signer-entered field values.
 *
 * The vendor asks integrators not to poll this (adaptive rate limiting, requests can be
 * blocked) and notes that contracts older than two weeks may return incomplete data. Prefer
 * webhooks for status changes. `contract_pdf_url` expires 3 days after the request.
 */
interface Input {
  contractId: string;
}

const contractGet: ActionDefinition<Input> = {
  key: "contract-get",
  type: "read",
  resource: "contract",
  title: "Get Contract",
  description: "Fetch a contract: status, signers, signer field values and the signed PDF URL. " +
    "Do not poll; use webhooks for status changes.",
  params: [contractIdParam],
  output: [{ key: "contract", type: "object", label: "The contract" }],

  async execute(input, ctx) {
    const data = await new ESignaturesClient(ctx).data(
      `/contracts/${encodeId(input.contractId)}`,
    ) as
      | { contract?: unknown }
      | undefined;
    return { contract: data?.contract };
  },
};

export default contractGet;
