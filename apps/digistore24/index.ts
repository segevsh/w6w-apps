import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import ping from "./actions/ping.ts";
import getUserInfo from "./actions/get-user-info.ts";
import listPurchases from "./actions/list-purchases.ts";
import getPurchase from "./actions/get-purchase.ts";
import listPurchasesOfEmail from "./actions/list-purchases-of-email.ts";
import updatePurchase from "./actions/update-purchase.ts";
import refundPurchase from "./actions/refund-purchase.ts";
import refundPartially from "./actions/refund-partially.ts";
import refundTransaction from "./actions/refund-transaction.ts";
import stopRebilling from "./actions/stop-rebilling.ts";
import startRebilling from "./actions/start-rebilling.ts";
import resendPurchaseConfirmationMail from "./actions/resend-purchase-confirmation-mail.ts";
import listInvoices from "./actions/list-invoices.ts";
import listTransactions from "./actions/list-transactions.ts";
import listBuyers from "./actions/list-buyers.ts";
import getBuyer from "./actions/get-buyer.ts";
import updateBuyer from "./actions/update-buyer.ts";
import listProducts from "./actions/list-products.ts";
import getProduct from "./actions/get-product.ts";
import createProduct from "./actions/create-product.ts";
import updateProduct from "./actions/update-product.ts";
import listCommissions from "./actions/list-commissions.ts";
import getAffiliateCommission from "./actions/get-affiliate-commission.ts";
import updateAffiliateCommission from "./actions/update-affiliate-commission.ts";
import listVouchers from "./actions/list-vouchers.ts";
import getVoucher from "./actions/get-voucher.ts";
import createVoucher from "./actions/create-voucher.ts";
import updateVoucher from "./actions/update-voucher.ts";
import deleteVoucher from "./actions/delete-voucher.ts";
import ipnInfo from "./actions/ipn-info.ts";
import ipnSetup from "./actions/ipn-setup.ts";
import ipnDelete from "./actions/ipn-delete.ts";
import listDeliveries from "./actions/list-deliveries.ts";
import getDelivery from "./actions/get-delivery.ts";
import updateDelivery from "./actions/update-delivery.ts";
import statsSalesSummary from "./actions/stats-sales-summary.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    ping,
    getUserInfo,
    listPurchases,
    getPurchase,
    listPurchasesOfEmail,
    updatePurchase,
    refundPurchase,
    refundPartially,
    refundTransaction,
    stopRebilling,
    startRebilling,
    resendPurchaseConfirmationMail,
    listInvoices,
    listTransactions,
    listBuyers,
    getBuyer,
    updateBuyer,
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
    listCommissions,
    getAffiliateCommission,
    updateAffiliateCommission,
    listVouchers,
    getVoucher,
    createVoucher,
    updateVoucher,
    deleteVoucher,
    ipnInfo,
    ipnSetup,
    ipnDelete,
    listDeliveries,
    getDelivery,
    updateDelivery,
    statsSalesSummary,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
