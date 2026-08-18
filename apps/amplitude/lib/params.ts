import type { Param } from "@w6w/types";

/**
 * The date window every query endpoint takes, in Amplitude's own format.
 *
 * `YYYYMMDD`, or `YYYYMMDDTHH` for hourly. Not ISO 8601, and an ISO string is
 * rejected rather than coerced — which is worth saying in the hint, because
 * every other API in this pack takes ISO.
 */
export const START_PARAM: Param = {
  key: "start",
  label: "From",
  type: "string",
  required: true,
  default: "",
  placeholder: "20260801",
  hint: "`YYYYMMDD`, or `YYYYMMDDTHH` for an hourly window. NOT ISO 8601 — Amplitude rejects " +
    "`2026-08-01`.",
};

export const END_PARAM: Param = {
  key: "end",
  label: "To",
  type: "string",
  required: true,
  default: "",
  placeholder: "20260818",
  hint: "`YYYYMMDD`, inclusive.",
};
