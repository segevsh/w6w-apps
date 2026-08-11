/**
 * Splitwise — shared-expense tracking: read and write expenses, groups,
 * friends and comments over the Splitwise API v3.0
 * (`secure.splitwise.com/api/v3.0`).
 *
 * Every path, verb, parameter, body field and enum in this app was verified on
 * 2026-08-11 against Splitwise's own **OpenAPI 3.0.1 document** — the one
 * `https://dev.splitwise.com/` (630,436 bytes, md5 `0bd7a58e43c4…`) embeds in
 * its Redoc `__redoc_state` payload, `info.version` `3.0.0`, 27 paths — plus
 * live unauthenticated probes against `secure.splitwise.com` and
 * `status.splitwise.com`. Nothing here came from a third-party integration
 * directory or from one of the community SDKs the vendor links to.
 *
 * The reference is alive: a scan of the whole document for
 * `deprecat|depreciat|sunset|retire|end of life|will be removed|no longer
 * supported` matches **zero** times, no operation carries `deprecated: true`,
 * and `v3.0` is the only version that answers — `/api/v1.0/…`, `/api/v2.0/…`
 * and `/api/v3.1/…` all return the site's HTML 404, byte-identical to a
 * nonsense path. It is the version whose page carries no deprecation banner
 * because it is the only version there is.
 *
 * ## The five findings that shaped this app, each documented where it matters
 *
 *  1. **HTTP 200 is not success** (`lib/client.ts`). Splitwise's own reference
 *     says so in six places: "200 OK does not indicate a successful response."
 *     A failed write comes back 200 with a populated `errors` object, or with
 *     `success: false`. Both channels are checked on every response.
 *  2. **`errors` has three shapes, and the naive check inverts** (`lib/client.ts`).
 *     A string under singular `error`, an object of field → messages, or a bare
 *     array — and `[]` and `{}` are both truthy, so `if (body.errors)` reports
 *     every successful `undelete_group` as a failure while `errors.base` misses
 *     the array form entirely.
 *  3. **Shares are flattened, not nested** (`lib/shares.ts`). The by-shares
 *     expense form takes `users__0__paid_share`-style keys in a JSON body, both
 *     columns must total the cost, and what Splitwise does with an unbalanced
 *     expense is *not documented* — so the balance check is client-side, exact
 *     (integer minor units), and overridable.
 *  4. **Two endpoints are public** (`actions/list-currencies.ts`).
 *     `get_currencies` and `get_categories` answer 200 with their full payload
 *     and no credential at all, so neither can ever be the auth probe — a
 *     Connection whose key was dropped would pass. `get_current_user` is the
 *     probe.
 *  5. **The documented OAuth 2 token endpoint does not route**
 *     (`auth/api-key.ts`). `POST /oauth/token` returns the site's
 *     byte-identical 404 under every body, header and host variant tried, while
 *     the OAuth **1.0a** endpoint names still answer. Only the API-key method
 *     is declared, and the evidence is recorded so the decision can be revisited
 *     rather than rediscovered.
 *
 * One more worth carrying: a Splitwise API key is **not** a scoped integration
 * token. It is full access to one person's account, and Splitwise offers no way
 * to narrow it.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import getCurrentUser from "./actions/get-current-user.ts";
import getUser from "./actions/get-user.ts";

import listGroups from "./actions/list-groups.ts";
import getGroup from "./actions/get-group.ts";
import createGroup from "./actions/create-group.ts";
import deleteGroup from "./actions/delete-group.ts";
import undeleteGroup from "./actions/undelete-group.ts";
import addUserToGroup from "./actions/add-user-to-group.ts";
import removeUserFromGroup from "./actions/remove-user-from-group.ts";

import listFriends from "./actions/list-friends.ts";
import getFriend from "./actions/get-friend.ts";
import createFriend from "./actions/create-friend.ts";
import deleteFriend from "./actions/delete-friend.ts";

import listExpenses from "./actions/list-expenses.ts";
import getExpense from "./actions/get-expense.ts";
import createExpenseEqual from "./actions/create-expense-equal.ts";
import createExpenseByShares from "./actions/create-expense-by-shares.ts";
import updateExpense from "./actions/update-expense.ts";
import deleteExpense from "./actions/delete-expense.ts";
import undeleteExpense from "./actions/undelete-expense.ts";

import listComments from "./actions/list-comments.ts";
import createComment from "./actions/create-comment.ts";
import deleteComment from "./actions/delete-comment.ts";

import listNotifications from "./actions/list-notifications.ts";
import listCurrencies from "./actions/list-currencies.ts";
import listCategories from "./actions/list-categories.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Users
    getCurrentUser,
    getUser,
    // Groups
    listGroups,
    getGroup,
    createGroup,
    deleteGroup,
    undeleteGroup,
    addUserToGroup,
    removeUserFromGroup,
    // Friends
    listFriends,
    getFriend,
    createFriend,
    deleteFriend,
    // Expenses
    listExpenses,
    getExpense,
    createExpenseEqual,
    createExpenseByShares,
    updateExpense,
    deleteExpense,
    undeleteExpense,
    // Comments
    listComments,
    createComment,
    deleteComment,
    // Activity + reference data
    listNotifications,
    listCurrencies,
    listCategories,
  ],
  // API key only. Splitwise's OAuth 2 authorization endpoint is live but its
  // documented token endpoint is not routed — measured, in `auth/api-key.ts` —
  // so declaring an `oauth2` method would render a Connect button that fails at
  // the exchange.
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
