/**
 * Meta Conversions API — server-side conversion event ingestion into a Meta
 * dataset (pixel), with Meta's required SHA-256 customer-data hashing applied
 * inside the app.
 *
 * Distinct from the two sibling Meta apps in this pack:
 *
 *   - `facebook` ("Facebook Pages") is the Graph API content surface — Pages,
 *     posts, comments, photos, videos, Page insights.
 *   - `facebook-lead-ads` reads the leadgen surface — forms and their leads.
 *   - this app WRITES measurement data. It is the only one of the three that
 *     handles customer PII, and the only one whose whole value is in a
 *     transformation (normalise + hash) rather than in a request shape.
 *
 * The API itself is small: one write endpoint, `POST /{dataset-id}/events`,
 * exposed here as a single-event form and a batch form, plus the three reads
 * Meta documents around it (the dataset node, the Dataset Quality API, and the
 * dataset's diagnostic checks). There is no deletion endpoint — `GET` and
 * `DELETE` are both unsupported on `/{ads-pixel-id}/events` — and offline /
 * physical-store events are not a separate surface but the same endpoint with
 * `action_source: "physical_store"`. See README.md for the full scope note.
 */
import type { AppDefinition } from "@w6w/types";
import conversionsToken from "./auth/conversions-token.ts";
import oauth2 from "./auth/oauth2.ts";
import sendEvent from "./actions/send-event.ts";
import sendEvents from "./actions/send-events.ts";
import getDataset from "./actions/get-dataset.ts";
import getDatasetQuality from "./actions/get-dataset-quality.ts";
import listDiagnostics from "./actions/list-diagnostics.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    sendEvent,
    sendEvents,
    getDataset,
    getDatasetQuality,
    listDiagnostics,
  ],
  auth: [conversionsToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
