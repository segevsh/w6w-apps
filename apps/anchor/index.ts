import type { AppDefinition } from "@w6w/types";
import businessGet from "./actions/business-get.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import proposalTemplateList from "./actions/proposal-template-list.ts";
import proposalTemplateGet from "./actions/proposal-template-get.ts";
import proposalDraftList from "./actions/proposal-draft-list.ts";
import proposalDraftGet from "./actions/proposal-draft-get.ts";
import proposalDraftCreateFromTemplate from "./actions/proposal-draft-create-from-template.ts";
import proposalDraftUpdate from "./actions/proposal-draft-update.ts";
import proposalList from "./actions/proposal-list.ts";
import proposalGet from "./actions/proposal-get.ts";
import proposalPublish from "./actions/proposal-publish.ts";
import proposalWithdrawForEditing from "./actions/proposal-withdraw-for-editing.ts";
import proposalRepublish from "./actions/proposal-republish.ts";
import proposalCancelEdit from "./actions/proposal-cancel-edit.ts";
import proposalApproveOnBehalf from "./actions/proposal-approve-on-behalf.ts";
import agreementList from "./actions/agreement-list.ts";
import agreementGet from "./actions/agreement-get.ts";
import agreementRename from "./actions/agreement-rename.ts";
import adhocAgreementGetOrCreate from "./actions/adhoc-agreement-get-or-create.ts";
import creditAdd from "./actions/credit-add.ts";
import chargesSubmit from "./actions/charges-submit.ts";
import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import payoutList from "./actions/payout-list.ts";
import payoutGet from "./actions/payout-get.ts";
import payoutInvoiceList from "./actions/payout-invoice-list.ts";
import serviceTemplateList from "./actions/service-template-list.ts";
import legalTermsList from "./actions/legal-terms-list.ts";
import webhookSubscriptionList from "./actions/webhook-subscription-list.ts";
import webhookSubscribe from "./actions/webhook-subscribe.ts";
import webhookUnsubscribe from "./actions/webhook-unsubscribe.ts";
import apiKey from "./auth/api-key.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

export default {
  actions: [
    businessGet,
    contactList,
    contactGet,
    contactCreate,
    proposalTemplateList,
    proposalTemplateGet,
    proposalDraftList,
    proposalDraftGet,
    proposalDraftCreateFromTemplate,
    proposalDraftUpdate,
    proposalList,
    proposalGet,
    proposalPublish,
    proposalWithdrawForEditing,
    proposalRepublish,
    proposalCancelEdit,
    proposalApproveOnBehalf,
    agreementList,
    agreementGet,
    agreementRename,
    adhocAgreementGetOrCreate,
    creditAdd,
    chargesSubmit,
    invoiceList,
    invoiceGet,
    payoutList,
    payoutGet,
    payoutInvoiceList,
    serviceTemplateList,
    legalTermsList,
    webhookSubscriptionList,
    webhookSubscribe,
    webhookUnsubscribe,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
