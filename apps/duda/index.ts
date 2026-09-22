/**
 * Duda — the Partner API front end for a website-builder platform that agencies
 * and SaaS companies white-label.
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-09-22 against Duda's own developer documentation
 * (`developer.duda.co`: the machine-readable markdown mirror of each reference
 * page embeds that endpoint's real OpenAPI 3.x fragment) and the Collections
 * guide at `docs/partner-api-concepts-collections.md`, plus live `curl` probes
 * against both regional hosts and against Duda's status page. Nothing came from
 * a third-party integration directory.
 *
 * Four findings shaped the design, each documented where it matters:
 *
 *  1. **Duda is region-sharded, but only into two hosts** (`lib/client.ts`,
 *     `auth/basic.ts`). Every documented endpoint declares both
 *     `https://api.duda.co` and `https://api.eu.duda.co`, and both answer live.
 *     That is a bounded set, so the manifest lists both hostnames and the
 *     Connection carries the choice — the same shape `amplitude` uses for its
 *     US/EU split, not the wildcard `mautic` and `tableau` need for a
 *     user-supplied host.
 *  2. **A 401 carries no body at all** (`auth/basic.ts`). The docs show a 401 as
 *     `ErrorRDT` JSON; measured live, every 401 answers `content-length: 0` with
 *     only a `WWW-Authenticate` header. The credential probe is therefore
 *     classified by the documented success *shape* — the paginated site list —
 *     rather than by status code, and the README records the finding.
 *  3. **Collections are documented separately and shaped differently**
 *     (`actions/list-collections.ts`). The Collections pages are an OpenAPI
 *     3.1.0 document describing the same API — bare arrays where the Partner API
 *     document uses a `PaginationResultRDT` envelope, and `/sites/...` paths
 *     against the single server `https://api.duda.co/api`.
 *  4. **A row write is a whole-row overwrite** (`actions/update-collection-rows.ts`).
 *     Duda's Collections guide says an update takes "row id + all fields", so a
 *     partial `data` object blanks what it omits rather than patching it.
 */
import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";

import listSites from "./actions/list-sites.ts";
import getSite from "./actions/get-site.ts";
import createSite from "./actions/create-site.ts";
import publishSite from "./actions/publish-site.ts";
import unpublishSite from "./actions/unpublish-site.ts";

import listPages from "./actions/list-pages.ts";

import getFormSubmissions from "./actions/get-form-submissions.ts";

import listCollections from "./actions/list-collections.ts";
import getCollection from "./actions/get-collection.ts";
import createCollectionRows from "./actions/create-collection-rows.ts";
import updateCollectionRows from "./actions/update-collection-rows.ts";
import deleteCollectionRows from "./actions/delete-collection-rows.ts";

import getAccount from "./actions/get-account.ts";
import createAccount from "./actions/create-account.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Sites
    listSites,
    getSite,
    createSite,
    publishSite,
    unpublishSite,
    // Pages
    listPages,
    // Form submissions
    getFormSubmissions,
    // Collections
    listCollections,
    getCollection,
    createCollectionRows,
    updateCollectionRows,
    deleteCollectionRows,
    // Accounts
    getAccount,
    createAccount,
  ],
  // HTTP Basic only. Duda's OpenAPI fragments also list a `token` bearer scheme,
  // but it is fed by an admin "Temporary Token" flow that is not the
  // partner-facing mechanism the getting-started guide documents.
  auth: [basic],
  healthChecks: [service, quota],
} satisfies AppDefinition;
