/**
 * Sanity — query and mutate a Content Lake from a workflow: GROQ queries,
 * transactional document mutations, publishing, revision history and dataset
 * management.
 *
 * Every path, parameter and behaviour here was taken from Sanity's own
 * reference documentation (`sanity.io/docs/http-reference/mutation`,
 * `/content-lake/api-cdn`, `/content-lake/mutation-patterns`, read 2026-08-18)
 * and the host layout was verified against the live API the same day.
 *
 * ## Drafts are separate documents, and that explains most surprises
 *
 * Sanity stores an unpublished edit as **its own document**, whose id is the
 * published id with a `drafts.` prefix. So `article-1` and `drafts.article-1`
 * are two documents:
 *
 *   - a plain `*[_type == "article"]` returns **both**, as near-duplicate
 *     results — which is why `document-query` defaults to filtering drafts out;
 *   - deleting `article-1` leaves its draft behind, to reappear in the Studio
 *     as an edit of a document that no longer exists — which is why
 *     `document-delete` offers to remove both in one transaction;
 *   - publishing is promoting one to the other, which is why that goes through
 *     the Actions API rather than being hand-rolled as a replace-plus-delete.
 *
 * ## Reads: the live API, not the CDN — on Sanity's own advice
 *
 * Sanity offers `{projectId}.api.sanity.io` (uncached) and
 * `{projectId}.apicdn.sanity.io` (cached), and says which an integration should
 * use: *"When building integrations with Sanity or responding to webhooks, we
 * recommend using the API to capture the latest saved content."*
 *
 * The failure mode is what makes the default matter: **"If Sanity's Content
 * Lake is unavailable, the API CDN will return the last cached content for up
 * to two hours."** A workflow reading through the CDN keeps succeeding through
 * an outage, on stale data, with nothing to show for it. So the CDN is an
 * explicit opt-in — and the `dataset` health check always reads the live host,
 * because a check that could be answered from cache is not a check.
 *
 * Mutations are unaffected either way: the CDN caches `/data/query` and
 * `/graphql` and rejects every other POST, so writes are routed to the live
 * host whatever the connection says.
 *
 * ## Query-based mutations stop silently at 10,000 documents
 *
 * Sanity's own words: a mutation on `*[_type == "article"]` *"is in fact
 * executed as if the query were written `*[_type == "article"][0..10000]`"*.
 * No error, no indication, just part of the job done. Both `document-patch`
 * and `document-delete` say so where a query goes in, and both offer Sanity's
 * native **dry run** — which is the only way to see a query mutation's blast
 * radius before committing to it.
 *
 * ## The project is in the hostname
 *
 * Data calls go to `{projectId}.api.sanity.io`; only projects and datasets live
 * on the bare `api.sanity.io`. That is why the egress allowlist covers
 * `*.api.sanity.io` rather than one host.
 *
 * Deliberately out of scope:
 *   - **Asset uploads.** They take raw bytes in the request body, which a
 *     sandbox has no way to produce.
 *   - **Listeners and the Live Content API.** They are long-lived streaming
 *     connections, not request/response calls.
 *   - **GraphQL.** It is a second, deployed-per-dataset interface over the same
 *     content; GROQ is the one that needs no deployment step.
 *   - **Schema deployment and Studio management.** Sanity's schema lives in the
 *     Studio codebase, so changing it is a deploy, not an API call — which is
 *     also why a document written here can be one the Studio would refuse.
 */
import type { AppDefinition } from "@w6w/types";
import token from "./auth/token.ts";

import documentQuery from "./actions/document-query.ts";
import documentGet from "./actions/document-get.ts";
import documentHistory from "./actions/document-history.ts";
import documentExport from "./actions/document-export.ts";

import documentCreate from "./actions/document-create.ts";
import documentPatch from "./actions/document-patch.ts";
import documentDelete from "./actions/document-delete.ts";
import documentPublish from "./actions/document-publish.ts";
import documentUnpublish from "./actions/document-unpublish.ts";

import projectList from "./actions/project-list.ts";
import datasetList from "./actions/dataset-list.ts";

import service from "./health/service.ts";
import dataset from "./health/dataset.ts";

export default {
  actions: [
    // reading
    documentQuery,
    documentGet,
    documentHistory,
    documentExport,
    // writing
    documentCreate,
    documentPatch,
    documentDelete,
    // the draft/published boundary
    documentPublish,
    documentUnpublish,
    // where the content lives
    projectList,
    datasetList,
  ],
  auth: [token],
  healthChecks: [service, dataset],
} satisfies AppDefinition;
