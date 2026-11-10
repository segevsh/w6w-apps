import { webhookTrigger } from "../lib/triggers.ts";

/** A signer declines to sign a contract. */
const signerDeclined = webhookTrigger({
  key: "signer-declined",
  title: "Signer Declined",
  description:
    "Fires when a signer declines to sign a contract. The run gets the contract, the signer and the reason they gave, if any.",
  status: "signer-declined",
  sample: {
    status: "signer-declined",
    contractId: "1contr11-2222",
    title: "Sample NDA",
    metadata: "ID0001",
    source: "api",
    test: "no",
    pdfUrl: null,
    signer: {
      id: "6signer6-9999",
      name: "Sam Signer",
      email: "sam@example.com",
      mobile: "+12481234567",
      company_name: "ACME Corp",
    },
    signers: [],
    reasonForDecline: "Commencement date is 5th of June",
    data: {},
  },
});

export default signerDeclined;
