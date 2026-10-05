import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

import createSession from "./actions/create-session.ts";
import getSessionResult from "./actions/get-session-result.ts";
import updateSession from "./actions/update-session.ts";
import getPaymentMethods from "./actions/get-payment-methods.ts";
import getPaymentMethodsBalance from "./actions/get-payment-methods-balance.ts";
import createPayment from "./actions/create-payment.ts";
import submitPaymentDetails from "./actions/submit-payment-details.ts";
import capturePayment from "./actions/capture-payment.ts";
import cancelPayment from "./actions/cancel-payment.ts";
import refundPayment from "./actions/refund-payment.ts";
import reversePayment from "./actions/reverse-payment.ts";
import updateAuthorisedAmount from "./actions/update-authorised-amount.ts";
import cancelPaymentByReference from "./actions/cancel-payment-by-reference.ts";
import createPaymentLink from "./actions/create-payment-link.ts";
import getPaymentLink from "./actions/get-payment-link.ts";
import expirePaymentLink from "./actions/expire-payment-link.ts";
import listStoredPaymentMethods from "./actions/list-stored-payment-methods.ts";
import createStoredPaymentMethod from "./actions/create-stored-payment-method.ts";
import deleteStoredPaymentMethod from "./actions/delete-stored-payment-method.ts";
import createDonation from "./actions/create-donation.ts";
import listDonationCampaigns from "./actions/list-donation-campaigns.ts";
import getCardDetails from "./actions/get-card-details.ts";
import createOrder from "./actions/create-order.ts";
import cancelOrder from "./actions/cancel-order.ts";

export default {
  actions: [
    createSession,
    getSessionResult,
    updateSession,
    getPaymentMethods,
    getPaymentMethodsBalance,
    createPayment,
    submitPaymentDetails,
    capturePayment,
    cancelPayment,
    refundPayment,
    reversePayment,
    updateAuthorisedAmount,
    cancelPaymentByReference,
    createPaymentLink,
    getPaymentLink,
    expirePaymentLink,
    listStoredPaymentMethods,
    createStoredPaymentMethod,
    deleteStoredPaymentMethod,
    createDonation,
    listDonationCampaigns,
    getCardDetails,
    createOrder,
    cancelOrder,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
