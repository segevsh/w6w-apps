import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

// customer
import createCompanyCustomer from "./actions/create-company-customer.ts";
import createIndividualCustomer from "./actions/create-individual-customer.ts";
import getCustomer from "./actions/get-customer.ts";
import listCustomers from "./actions/list-customers.ts";

// supplier
import createSupplier from "./actions/create-supplier.ts";
import getSupplier from "./actions/get-supplier.ts";
import listSuppliers from "./actions/list-suppliers.ts";

// product
import createProduct from "./actions/create-product.ts";
import getProduct from "./actions/get-product.ts";
import listProducts from "./actions/list-products.ts";

// customer invoice
import createCustomerInvoice from "./actions/create-customer-invoice.ts";
import getCustomerInvoice from "./actions/get-customer-invoice.ts";
import listCustomerInvoices from "./actions/list-customer-invoices.ts";
import sendCustomerInvoiceByEmail from "./actions/send-customer-invoice-by-email.ts";

// supplier invoice
import getSupplierInvoice from "./actions/get-supplier-invoice.ts";
import listSupplierInvoices from "./actions/list-supplier-invoices.ts";

// journal
import getJournal from "./actions/get-journal.ts";
import listJournals from "./actions/list-journals.ts";

// ledger
import listLedgerAccounts from "./actions/list-ledger-accounts.ts";
import listCategories from "./actions/list-categories.ts";
import listTransactions from "./actions/list-transactions.ts";

// profile
import getMe from "./actions/get-me.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listCustomers,
    getCustomer,
    createCompanyCustomer,
    createIndividualCustomer,
    listSuppliers,
    getSupplier,
    createSupplier,
    listProducts,
    getProduct,
    createProduct,
    listCustomerInvoices,
    getCustomerInvoice,
    createCustomerInvoice,
    sendCustomerInvoiceByEmail,
    listSupplierInvoices,
    getSupplierInvoice,
    listJournals,
    getJournal,
    listLedgerAccounts,
    listCategories,
    listTransactions,
    getMe,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
