/**
 * Lexware Office (formerly lexoffice) — contacts, articles, sales documents and the voucher list
 * over the Public API v1 (`api.lexware.io`). Verified 2026-10-06 against the vendor's
 * reference (`developers.lexware.io/docs/`). See README.md for what is deliberately not covered.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import articleCreate from "./actions/article-create.ts";
import articleGet from "./actions/article-get.ts";
import articleList from "./actions/article-list.ts";
import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactList from "./actions/contact-list.ts";
import contactUpdate from "./actions/contact-update.ts";
import countryList from "./actions/country-list.ts";
import creditNoteCreate from "./actions/credit-note-create.ts";
import creditNoteGet from "./actions/credit-note-get.ts";
import documentFileGet from "./actions/document-file-get.ts";
import invoiceCreate from "./actions/invoice-create.ts";
import invoiceGet from "./actions/invoice-get.ts";
import orderConfirmationCreate from "./actions/order-confirmation-create.ts";
import orderConfirmationGet from "./actions/order-confirmation-get.ts";
import paymentConditionList from "./actions/payment-condition-list.ts";
import paymentGet from "./actions/payment-get.ts";
import postingCategoryList from "./actions/posting-category-list.ts";
import profileGet from "./actions/profile-get.ts";
import quotationCreate from "./actions/quotation-create.ts";
import quotationGet from "./actions/quotation-get.ts";
import voucherList from "./actions/voucher-list.ts";
import api from "./health/api.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    articleCreate,
    articleGet,
    articleList,
    contactCreate,
    contactGet,
    contactList,
    contactUpdate,
    countryList,
    creditNoteCreate,
    creditNoteGet,
    documentFileGet,
    invoiceCreate,
    invoiceGet,
    orderConfirmationCreate,
    orderConfirmationGet,
    paymentConditionList,
    paymentGet,
    postingCategoryList,
    profileGet,
    quotationCreate,
    quotationGet,
    voucherList,
  ],
  auth: [apiKey],
  healthChecks: [api, service, quota],
} satisfies AppDefinition;
