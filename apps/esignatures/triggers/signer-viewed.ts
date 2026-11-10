import { webhookTrigger } from "../lib/triggers.ts";

/** A signer opens the contract for the first time. */
const signerViewed = webhookTrigger({
  key: "signer-viewed",
  title: "Signer Viewed Contract",
  description:
    "Fires when a signer views the contract for the first time. The run gets the contract and the signer.",
  status: "signer-viewed-the-contract",
  sample: {
    status: "signer-viewed-the-contract",
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
    reasonForDecline: null,
    data: {},
  },
});

export default signerViewed;
