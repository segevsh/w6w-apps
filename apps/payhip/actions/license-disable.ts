import { licenseAction } from "../lib/license-action.ts";

/** `PUT /api/v2/license/disable` */
export default licenseAction({
  key: "license-disable",
  type: "perform",
  title: "Disable License Key",
  description: "Disable a license key, for example when a customer breaks your terms of service.",
  op: "disable",
  method: "PUT",
  idempotent: true,
});
