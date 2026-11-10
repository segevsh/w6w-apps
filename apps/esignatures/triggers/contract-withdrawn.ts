import { webhookTrigger } from "../lib/triggers.ts";

/** A contract is withdrawn, or a signer declines to sign it. */
const contractWithdrawn = webhookTrigger({
  key: "contract-withdrawn",
  title: "Contract Withdrawn",
  description:
    "Fires when a contract is withdrawn (this notification is also sent when a signer declines to sign). The run gets the contract and its signers.",
  status: "contract-withdrawn",
  sample: {
    status: "contract-withdrawn",
    contractId: "1contr11-2222",
    title: "Sample NDA",
    metadata: "ID0001",
    source: "api",
    test: "no",
    pdfUrl: null,
    signer: null,
    signers: [{
      id: "6signer6-9999",
      name: "Sam Signer",
      email: "sam@example.com",
      mobile: "+12481234567",
      company_name: "ACME Corp",
    }],
    reasonForDecline: null,
    data: {},
  },
});

export default contractWithdrawn;
