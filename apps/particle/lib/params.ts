import type { Param } from "@w6w/types";

/** The device. Ids are 24 hex characters; names are not reliably accepted. */
export const DEVICE_PARAM: Param = {
  key: "deviceId",
  label: "Device ID",
  type: "string",
  required: true,
  default: "",
  placeholder: "0123456789abcdef01234567",
  hint: "24 hexadecimal characters. `device-list` reports them; a device NAME works on some " +
    "paths and not others.",
};

/** Product-scoped calls take the product id or slug. */
export const PRODUCT_PARAM: Param = {
  key: "product",
  label: "Product",
  type: "string",
  default: "",
  hint: "A product id or slug. Blank uses the account's own claimed devices instead.",
};
