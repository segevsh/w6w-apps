import type { AppDefinition } from "@w6w/types";
import apiCredentials from "./auth/api-credentials.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import createTransaction from "./actions/create-transaction.ts";
import getTransaction from "./actions/get-transaction.ts";
import listBatchTransactions from "./actions/list-batch-transactions.ts";
import listUnsettledTransactions from "./actions/list-unsettled-transactions.ts";
import listCustomerTransactions from "./actions/list-customer-transactions.ts";
import updateHeldTransaction from "./actions/update-held-transaction.ts";
import getBatchStatistics from "./actions/get-batch-statistics.ts";
import listSettledBatches from "./actions/list-settled-batches.ts";
import createCustomerProfile from "./actions/create-customer-profile.ts";
import createProfileFromTransaction from "./actions/create-profile-from-transaction.ts";
import getCustomerProfile from "./actions/get-customer-profile.ts";
import listCustomerProfileIds from "./actions/list-customer-profile-ids.ts";
import updateCustomerProfile from "./actions/update-customer-profile.ts";
import deleteCustomerProfile from "./actions/delete-customer-profile.ts";
import createPaymentProfile from "./actions/create-payment-profile.ts";
import getPaymentProfile from "./actions/get-payment-profile.ts";
import listPaymentProfiles from "./actions/list-payment-profiles.ts";
import updatePaymentProfile from "./actions/update-payment-profile.ts";
import deletePaymentProfile from "./actions/delete-payment-profile.ts";
import validatePaymentProfile from "./actions/validate-payment-profile.ts";
import createShippingAddress from "./actions/create-shipping-address.ts";
import getShippingAddress from "./actions/get-shipping-address.ts";
import updateShippingAddress from "./actions/update-shipping-address.ts";
import deleteShippingAddress from "./actions/delete-shipping-address.ts";
import createSubscription from "./actions/create-subscription.ts";
import updateSubscription from "./actions/update-subscription.ts";
import cancelSubscription from "./actions/cancel-subscription.ts";
import getSubscription from "./actions/get-subscription.ts";
import getSubscriptionStatus from "./actions/get-subscription-status.ts";
import listSubscriptions from "./actions/list-subscriptions.ts";
import getHostedPaymentPage from "./actions/get-hosted-payment-page.ts";
import getHostedProfilePage from "./actions/get-hosted-profile-page.ts";
import getMerchantDetails from "./actions/get-merchant-details.ts";
import getAccountUpdaterSummary from "./actions/get-account-updater-summary.ts";
import getAccountUpdaterDetails from "./actions/get-account-updater-details.ts";
import chargePayment from "./actions/charge-payment.ts";
import authorizePayment from "./actions/authorize-payment.ts";
import capturePayment from "./actions/capture-payment.ts";
import refundPayment from "./actions/refund-payment.ts";
import voidPayment from "./actions/void-payment.ts";
import newCustomerTransaction from "./triggers/new-customer-transaction.ts";

export default {
  actions: [
    createTransaction,
    getTransaction,
    listBatchTransactions,
    listUnsettledTransactions,
    listCustomerTransactions,
    updateHeldTransaction,
    getBatchStatistics,
    listSettledBatches,
    createCustomerProfile,
    createProfileFromTransaction,
    getCustomerProfile,
    listCustomerProfileIds,
    updateCustomerProfile,
    deleteCustomerProfile,
    createPaymentProfile,
    getPaymentProfile,
    listPaymentProfiles,
    updatePaymentProfile,
    deletePaymentProfile,
    validatePaymentProfile,
    createShippingAddress,
    getShippingAddress,
    updateShippingAddress,
    deleteShippingAddress,
    createSubscription,
    updateSubscription,
    cancelSubscription,
    getSubscription,
    getSubscriptionStatus,
    listSubscriptions,
    getHostedPaymentPage,
    getHostedProfilePage,
    getMerchantDetails,
    getAccountUpdaterSummary,
    getAccountUpdaterDetails,
    chargePayment,
    authorizePayment,
    capturePayment,
    refundPayment,
    voidPayment,
  ],
  triggers: [newCustomerTransaction],
  auth: [apiCredentials],
  healthChecks: [service, quota],
} satisfies AppDefinition;
