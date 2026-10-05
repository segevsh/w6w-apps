import { licenseAction } from "../lib/license-action.ts";

/** `PUT /api/v2/license/decrease` — NOT idempotent: every call removes one use. */
export default licenseAction({
  key: "license-usage-decrease",
  type: "perform",
  title: "Decrease License Usage",
  description:
    "Remove one from a license key's use count (a deactivation). Not idempotent: a retry counts twice.",
  op: "decrease",
  method: "PUT",
  idempotent: false,
});
