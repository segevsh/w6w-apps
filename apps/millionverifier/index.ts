import type { AppDefinition } from "@w6w/types";
import bulkDelete from "./actions/bulk-delete.ts";
import bulkDownload from "./actions/bulk-download.ts";
import bulkGetFile from "./actions/bulk-get-file.ts";
import bulkListFiles from "./actions/bulk-list-files.ts";
import bulkStop from "./actions/bulk-stop.ts";
import bulkUpload from "./actions/bulk-upload.ts";
import getCredits from "./actions/get-credits.ts";
import verifyEmail from "./actions/verify-email.ts";
import apiKey from "./auth/api-key.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

/**
 * MillionVerifier — real-time and bulk email verification.
 * Findings that shaped this app (2026-10-06):
 *
 * - Every error is HTTP 200 with a JSON `error` string; the client reads the body.
 * - Two hosts, and the key has two names: `api=` on api.millionverifier.com, `key=` on
 *   bulkapi.millionverifier.com. `sign` picks by hostname.
 * - Bulk stop and delete are GETs; download is a file on success and JSON on failure.
 */
const app: AppDefinition = {
  actions: [
    verifyEmail,
    getCredits,
    bulkUpload,
    bulkGetFile,
    bulkListFiles,
    bulkDownload,
    bulkStop,
    bulkDelete,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
};

export default app;
