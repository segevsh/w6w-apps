import { webhookTrigger } from "../lib/triggers.ts";

/** A reminder is sent to a signer who has not signed yet. */
const contractReminderSent = webhookTrigger({
  key: "contract-reminder-sent",
  title: "Contract Reminder Sent",
  description:
    "Fires when eSignatures.com sends a reminder to a signer who has not signed yet. The run gets the contract and the signer reminded.",
  status: "contract-reminder-sent-to-signer",
  sample: {
    status: "contract-reminder-sent-to-signer",
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

export default contractReminderSent;
