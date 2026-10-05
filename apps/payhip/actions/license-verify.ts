import { licenseAction } from "../lib/license-action.ts";

/** `GET /api/v2/license/verify` (legacy v1: `/api/v1/license/verify`) */
export default licenseAction({
  key: "license-verify",
  type: "read",
  title: "Verify License Key",
  description:
    "Look up a license key and return whether it is enabled, its buyer and its use count. Read-only: it does not count a use (use Increase License Usage for that). An unknown key, a wrong secret and a failed lookup all come back as found: false.",
  op: "verify",
  method: "GET",
  emptyIsResult: true,
});
