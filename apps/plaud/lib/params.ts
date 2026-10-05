import type { Param } from "@w6w/types";
import { DEVICE_TYPES } from "./client.ts";

export const SN_PARAM: Param = {
  key: "sn",
  label: "Serial number",
  type: "string",
  required: true,
  placeholder: "8810000000000001",
  hint: "The device serial number. A serial starting 881 is a notepro, 882 a notepins.",
};

export const DEVICE_TYPE_PARAM: Param = {
  key: "type",
  label: "Device type",
  type: "select",
  options: DEVICE_TYPES.map((t) => ({ value: t, label: t })),
  hint: "Left empty, derived from the serial number prefix (881 notepro, 882 notepins).",
};
