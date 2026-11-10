import { webhookTrigger } from "../lib/triggers.ts";

/** One signer signs a contract. */
const signerSigned = webhookTrigger({
  key: "signer-signed",
  title: "Signer Signed",
  description:
    "Fires when a signer signs a contract. The run gets the contract and the signer with the values they entered into the contract's fields.",
  status: "signer-signed",
  sample: {
    status: "signer-signed",
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

export default signerSigned;
