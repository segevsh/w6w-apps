import { licenseAction } from "../lib/license-action.ts";

/** `PUT /api/v2/license/usage` — NOT idempotent: every call adds one use. */
export default licenseAction({
  key: "license-usage-increase",
  type: "perform",
  title: "Increase License Usage",
  description:
    "Add one to a license key's use count (an activation). Not idempotent: a retry counts twice.",
  op: "usage",
  method: "PUT",
  idempotent: false,
});
