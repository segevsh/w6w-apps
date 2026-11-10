import { webhookTrigger } from "../lib/triggers.ts";

/** Any notification eSignatures.com sends to the webhook URL. */
const contractEvent = webhookTrigger({
  key: "contract-event",
  title: "Contract Event",
  description:
    "Fires for every webhook notification eSignatures.com sends, or only the statuses listed in Events: contract sent, reminder, signed, withdrawn, signer viewed, signer signed, signer declined, mobile update request, SMS reply and delivery errors. The run gets the notification status, the contract and the signer, so branch on status.",
  anyEvent: true,

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

export default contractEvent;
