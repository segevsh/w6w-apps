import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import listPeople from "./actions/list-people.ts";
import getPerson from "./actions/get-person.ts";
import createPerson from "./actions/create-person.ts";
import updatePerson from "./actions/update-person.ts";
import deletePerson from "./actions/delete-person.ts";
import listAccounts from "./actions/list-accounts.ts";
import getAccount from "./actions/get-account.ts";
import createAccount from "./actions/create-account.ts";
import updateAccount from "./actions/update-account.ts";
import deleteAccount from "./actions/delete-account.ts";
import addAccountMember from "./actions/add-account-member.ts";
import removeAccountMember from "./actions/remove-account-member.ts";
import cancelAccount from "./actions/cancel-account.ts";
import removeAccountCancellation from "./actions/remove-account-cancellation.ts";
import listDeals from "./actions/list-deals.ts";
import getDeal from "./actions/get-deal.ts";
import createDeal from "./actions/create-deal.ts";
import updateDeal from "./actions/update-deal.ts";
import deleteDeal from "./actions/delete-deal.ts";
import listEmailLists from "./actions/list-email-lists.ts";
import getEmailList from "./actions/get-email-list.ts";
import listEmailSubscribers from "./actions/list-email-subscribers.ts";
import subscribeToEmailList from "./actions/subscribe-to-email-list.ts";
import unsubscribeFromEmailList from "./actions/unsubscribe-from-email-list.ts";
import listCases from "./actions/list-cases.ts";
import getCase from "./actions/get-case.ts";
import createCase from "./actions/create-case.ts";
import listArticles from "./actions/list-articles.ts";
import listPlans from "./actions/list-plans.ts";
import getPlan from "./actions/get-plan.ts";
import listPlanFamilies from "./actions/list-plan-families.ts";
import listSubscriptions from "./actions/list-subscriptions.ts";
import getSubscription from "./actions/get-subscription.ts";
import listInvoices from "./actions/list-invoices.ts";
import getInvoice from "./actions/get-invoice.ts";
import listTransactions from "./actions/list-transactions.ts";
import addUsage from "./actions/add-usage.ts";
import listActivities from "./actions/list-activities.ts";
import addCustomActivity from "./actions/add-custom-activity.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

/**
 * Outseta — all-in-one membership, billing, CRM, email and support for SaaS.
 *
 * One front door per account: `https://<subdomain>.outseta.com/api/v1`, with the
 * subdomain collected on the Connection. The manifest allows `*.outseta.com`.
 *
 * Deliberately left out (see README): the end-user login/2FA token endpoints,
 * which are for a logged-in person's bearer token rather than server-side keys,
 * subscription-changing writes whose request shapes are too deep to type
 * honestly (first-time subscription, change subscription), and extend-trial,
 * whose `ToDate`/`ExpirationDate` pair the docs do not explain.
 */
export default {
  actions: [
    // person
    listPeople,
    getPerson,
    createPerson,
    updatePerson,
    deletePerson,
    // account
    listAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    addAccountMember,
    removeAccountMember,
    cancelAccount,
    removeAccountCancellation,
    // deal
    listDeals,
    getDeal,
    createDeal,
    updateDeal,
    deleteDeal,
    // email-list
    listEmailLists,
    getEmailList,
    listEmailSubscribers,
    subscribeToEmailList,
    unsubscribeFromEmailList,
    // support
    listCases,
    getCase,
    createCase,
    listArticles,
    // billing
    listPlans,
    getPlan,
    listPlanFamilies,
    listSubscriptions,
    getSubscription,
    listInvoices,
    getInvoice,
    listTransactions,
    addUsage,
    // activity
    listActivities,
    addCustomActivity,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
