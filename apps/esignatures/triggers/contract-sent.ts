import { webhookTrigger } from "../lib/triggers.ts";

/** A contract is sent to a signer for signature. */
const contractSent = webhookTrigger({
  key: "contract-sent",
  title: "Contract Sent to Signer",
  description:
    "Fires when a contract is sent to a signer for signature. The run gets the contract (id, title, metadata, source, test flag) and the signer it was sent to.",
  status: "contract-sent-to-signer",
  sample: {
    status: "contract-sent-to-signer",
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

export default contractSent;
