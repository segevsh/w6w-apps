import { webhookTrigger } from "../lib/triggers.ts";

/** eSignatures.com could not deliver a signature request (`email-delivery-failed` or `sms-delivery-failed`). */
const deliveryError = webhookTrigger({
  key: "delivery-error",
  title: "Delivery Error",
  description:
    "Fires when eSignatures.com cannot deliver a signature request by email or SMS. The run gets the contract id, its metadata and the raw notification with the error code (`email-delivery-failed` or `sms-delivery-failed`) and message.",
  status: "error",
  sample: {
    status: "error",
    contractId: "1contr11-2222",
    title: null,
    metadata: "ID0001",
    source: null,
    test: null,
    pdfUrl: null,
    signer: null,
    signers: [],
    reasonForDecline: null,
    data: {
      error_code: "email-delivery-failed",
      error_message: "Mailbox full",
      contract_id: "1contr11-2222",
      metadata: "ID0001",
    },
  },
});

export default deliveryError;
