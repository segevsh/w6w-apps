import { webhookTrigger } from "../lib/triggers.ts";

/** Every signer has signed a contract. */
const contractSigned = webhookTrigger({
  key: "contract-signed",
  title: "Contract Signed",
  description:
    "Fires once all signers have signed a contract. The run gets the contract, every signer with the values they entered and a link to the signed PDF (it expires after 3 days).",
  status: "contract-signed",
  sample: {
    status: "contract-signed",
    contractId: "1contr11-2222",
    title: "Sample NDA",
    metadata: "ID0001",
    source: "api",
    test: "no",
    pdfUrl: "https://example.com/signed-contract.pdf",
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

export default contractSigned;
