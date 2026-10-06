/**
 * Facebook Custom Audiences — the Meta Marketing API's custom-audience
 * surface: customer-list audiences, their members, and lookalikes.
 *
 * Distinct from the sibling Meta apps in this pack:
 *
 *   - `facebook` is the Pages content surface;
 *   - `facebook-lead-ads` reads lead forms and leads;
 *   - `facebook-conversions` sends conversion events to a dataset;
 *   - this app manages the AUDIENCES an ad account targets, and is the one that
 *     uploads customer contact data to Meta — which is why the normalise-and-
 *     hash step lives in `lib/audience-data.ts` and runs inside the app.
 *
 * See README.md for what is deliberately left out.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import listAdAccounts from "./actions/list-ad-accounts.ts";
import listCustomAudiences from "./actions/list-custom-audiences.ts";
import getCustomAudience from "./actions/get-custom-audience.ts";
import createCustomAudience from "./actions/create-custom-audience.ts";
import updateCustomAudience from "./actions/update-custom-audience.ts";
import deleteCustomAudience from "./actions/delete-custom-audience.ts";
import addUsers from "./actions/add-users.ts";
import removeUsers from "./actions/remove-users.ts";
import createLookalikeAudience from "./actions/create-lookalike-audience.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listAdAccounts,
    listCustomAudiences,
    getCustomAudience,
    createCustomAudience,
    updateCustomAudience,
    deleteCustomAudience,
    addUsers,
    removeUsers,
    createLookalikeAudience,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
