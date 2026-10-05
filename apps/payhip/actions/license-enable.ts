import { licenseAction } from "../lib/license-action.ts";

/** `PUT /api/v2/license/enable` */
export default licenseAction({
  key: "license-enable",
  type: "perform",
  title: "Enable License Key",
  description:
    "Re-enable a disabled license key. Payhip disables a key automatically when its transaction is refunded.",
  op: "enable",
  method: "PUT",
  idempotent: true,
});
