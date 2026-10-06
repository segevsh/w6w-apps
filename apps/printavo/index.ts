import type { AppDefinition } from "@w6w/types";
import credentials from "./auth/credentials.ts";
import userGet from "./actions/user-get.ts";
import accountGet from "./actions/account-get.ts";
import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerUpdate from "./actions/customer-update.ts";
import customerDelete from "./actions/customer-delete.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import quoteList from "./actions/quote-list.ts";
import invoiceList from "./actions/invoice-list.ts";
import orderList from "./actions/order-list.ts";
import quoteGet from "./actions/quote-get.ts";
import invoiceGet from "./actions/invoice-get.ts";
import orderGet from "./actions/order-get.ts";
import quoteCreate from "./actions/quote-create.ts";
import quoteUpdate from "./actions/quote-update.ts";
import invoiceUpdate from "./actions/invoice-update.ts";
import quoteDuplicate from "./actions/quote-duplicate.ts";
import invoiceDuplicate from "./actions/invoice-duplicate.ts";
import quoteDelete from "./actions/quote-delete.ts";
import invoiceDelete from "./actions/invoice-delete.ts";
import orderStatusSet from "./actions/order-status-set.ts";
import statusList from "./actions/status-list.ts";
import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";
import taskDelete from "./actions/task-delete.ts";
import inquiryList from "./actions/inquiry-list.ts";
import inquiryGet from "./actions/inquiry-get.ts";
import inquiryCreate from "./actions/inquiry-create.ts";
import paymentCreate from "./actions/payment-create.ts";
import paymentRequestList from "./actions/payment-request-list.ts";
import productSearch from "./actions/product-search.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    userGet,
    accountGet,
    customerList,
    customerGet,
    customerCreate,
    customerUpdate,
    customerDelete,
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    quoteList,
    invoiceList,
    orderList,
    quoteGet,
    invoiceGet,
    orderGet,
    quoteCreate,
    quoteUpdate,
    invoiceUpdate,
    quoteDuplicate,
    invoiceDuplicate,
    quoteDelete,
    invoiceDelete,
    orderStatusSet,
    statusList,
    taskList,
    taskGet,
    taskCreate,
    taskUpdate,
    taskDelete,
    inquiryList,
    inquiryGet,
    inquiryCreate,
    paymentCreate,
    paymentRequestList,
    productSearch,
  ],
  auth: [credentials],
  healthChecks: [service, quota],
} satisfies AppDefinition;
