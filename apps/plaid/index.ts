/**
 * Plaid — read bank data from a workflow: accounts, balances, transactions,
 * identity and liabilities, plus the Items that connect them.
 *
 * Paths come from Plaid's reference (`plaid.com/docs/api`); the hosts,
 * credential placement and error taxonomy were verified live on 2026-08-18.
 *
 * ## Everything is a POST, and the credential goes in the body
 *
 * Plaid takes no `Authorization` header at all: every call is a `POST` whose
 * JSON body carries `client_id` and `secret` beside the request's own
 * arguments. An Action may never touch a credential, so the pair is injected by
 * the auth **`sign` hook** — the one hook allowed to hold one, and the only one
 * that receives the request body. Actions build a credential-free body and never
 * see them.
 *
 * ## Two credentials, and only one of them is this connection
 *
 * This is the structural thing to understand. The connection holds the
 * *application's* `client_id` and `secret`. Every call about somebody's bank
 * data also needs an **`access_token`**, which identifies one **Item**: one
 * user's connection to one financial institution.
 *
 * Access tokens are therefore **data the workflow holds**, not connection
 * fields — one connection fans out over thousands of Items. They are also
 * long-lived secrets: anyone holding one can read that person's transactions
 * until the Item is removed. Every action that takes one declares it
 * `type: "secret"`, and nothing here logs one.
 *
 * ## `transactions/sync`, and why there is no date-range read
 *
 * Bank transactions are not immutable — a pending charge becomes a posted one
 * with a different amount and id, a merchant name is enriched days later, a
 * transaction is removed. A date-range read cannot express that: it returns
 * what is true *now* for a window, so re-reading last week sees changes it
 * cannot distinguish from new data.
 *
 * `/transactions/sync` answers "what changed since this cursor", returning
 * `added`, `modified` and `removed` separately. That is the only shape that
 * stays correct, so it is the only one this app implements — `/transactions/get`
 * is deliberately absent.
 *
 * ## Two environments, and the third one is gone
 *
 * `sandbox` and `production` have **separate secrets** against one client id,
 * so a connection belongs to exactly one, and they are two auth methods rather
 * than a field. Plaid's old `development` environment no longer exists —
 * verified, `development.plaid.com` fails DNS resolution rather than answering
 * — so it is not offered.
 *
 * Sandbox is also the only place an Item can be created **without a browser**
 * (`sandbox-item-create`), which is what makes a Plaid workflow testable end to
 * end.
 *
 * ## What a workflow cannot do, by design
 *
 * Connecting a bank account requires a human in Plaid Link, choosing their
 * institution and typing their credentials. A workflow can mint the link token
 * that flow needs and exchange the public token it returns — the two server
 * halves — and nothing in between. That is correct, and this app does not
 * pretend otherwise.
 *
 * ## The error code that matters most
 *
 * `ITEM_LOGIN_REQUIRED` means one user's bank credentials have expired.
 * Retrying will never fix it; somebody has to re-authenticate through Link in
 * update mode, which `link-token-create` supports. Treating it as transient is
 * how a sync silently stops working, so the client names it specifically.
 *
 * Deliberately out of scope:
 *   - **Money movement** (Transfer, Payment Initiation). Initiating a debit
 *     from a workflow is a different risk class, with authorisation and
 *     reconciliation semantics that deserve their own deliberate integration.
 *   - **Income and asset reports.** They are asynchronous report jobs whose
 *     output is a PDF-shaped artefact for an underwriter, not a workflow step.
 *   - **Webhook verification.** Verifying Plaid's JWT signature is a receiver
 *     concern, and belongs to whatever serves the endpoint.
 */
import type { AppDefinition } from "@w6w/types";
import clientSecret from "./auth/client-secret.ts";
import clientSecretSandbox from "./auth/client-secret-sandbox.ts";

import transactionSync from "./actions/transaction-sync.ts";
import transactionRefresh from "./actions/transaction-refresh.ts";
import accountList from "./actions/account-list.ts";
import balanceGet from "./actions/balance-get.ts";
import identityGet from "./actions/identity-get.ts";
import authGet from "./actions/auth-get.ts";
import liabilitiesGet from "./actions/liabilities-get.ts";

import linkTokenCreate from "./actions/link-token-create.ts";
import publicTokenExchange from "./actions/public-token-exchange.ts";
import sandboxItemCreate from "./actions/sandbox-item-create.ts";
import itemGet from "./actions/item-get.ts";
import itemRemove from "./actions/item-remove.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import institutionList from "./actions/institution-list.ts";

import service from "./health/service.ts";
import credentials from "./health/credentials.ts";

export default {
  actions: [
    // the money
    transactionSync,
    accountList,
    balanceGet,
    liabilitiesGet,
    transactionRefresh,
    // the person
    identityGet,
    authGet,
    // connecting a bank — the two server halves of a browser flow
    linkTokenCreate,
    publicTokenExchange,
    sandboxItemCreate,
    // keeping the connection alive
    itemGet,
    webhookUpdate,
    itemRemove,
    // where it can connect to
    institutionList,
  ],
  auth: [clientSecret, clientSecretSandbox],
  healthChecks: [service, credentials],
} satisfies AppDefinition;
