import type { ActionDefinition } from "@w6w/types";
import { CertifierClient, encodeId } from "../lib/client.ts";
import { credentialIdParam } from "../lib/params.ts";

interface Input {
  credentialId: string;
}

const credentialDesignsGet: ActionDefinition<Input> = {
  key: "credential-designs-get",
  type: "read",
  resource: "credential",
  title: "Get Credential Designs",
  description:
    "List the ordered designs a credential renders with and their PNG and PDF preview URLs " +
    "(immutable, versioned by a digest of the design and the resolved attributes).",
  params: [credentialIdParam],
  output: [{ key: "designs", type: "array", label: "Designs with previews" }],

  async execute(input, ctx) {
    const designs = await new CertifierClient(ctx).json<unknown[]>(
      `/credentials/${encodeId(input.credentialId)}/designs`,
    );
    return { designs: Array.isArray(designs) ? designs : [] };
  },
};

export default credentialDesignsGet;
