import type { Param } from "@w6w/types";

/** Shared `Param` fragments, copied from Skyvern's OpenAPI document (fetched 2026-10-06). */

export const runStatusOptions = [
  { value: "created", label: "Created" },
  { value: "queued", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "terminated", label: "Terminated" },
  { value: "timed_out", label: "Timed out" },
  { value: "canceled", label: "Canceled" },
];

export const runIdParam: Param = {
  key: "runId",
  label: "Run ID",
  type: "string",
  required: true,
  hint: "A task run id (`tsk_…`) or an agent run id (`wr_…`), as returned when the run started.",
};

/** `page` + `page_size` as every Skyvern list endpoint spells them (1-based page). */
export function paginationParams(defaultPageSize = 10, maxPageSize?: number): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
      hint: "1-based page number.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: defaultPageSize,
      validation: maxPageSize ? { integer: true, min: 1, max: maxPageSize } : {
        integer: true,
        min: 1,
      },
    },
  ];
}

export const proxyLocationOptions = [
  "RESIDENTIAL",
  "RESIDENTIAL_ISP",
  "RESIDENTIAL_ES",
  "RESIDENTIAL_IE",
  "RESIDENTIAL_GB",
  "RESIDENTIAL_IN",
  "RESIDENTIAL_JP",
  "RESIDENTIAL_FR",
  "RESIDENTIAL_DE",
  "RESIDENTIAL_NZ",
  "RESIDENTIAL_ZA",
  "RESIDENTIAL_AR",
  "RESIDENTIAL_AU",
  "RESIDENTIAL_BR",
  "RESIDENTIAL_TR",
  "RESIDENTIAL_CA",
  "RESIDENTIAL_MX",
  "RESIDENTIAL_IT",
  "RESIDENTIAL_NL",
  "RESIDENTIAL_PH",
  "RESIDENTIAL_KR",
  "RESIDENTIAL_SA",
  "NONE",
].map((value) => ({ value, label: value }));

export const sessionIdParam: Param = {
  key: "browserSessionId",
  label: "Browser session ID",
  type: "string",
  required: true,
  hint: "A browser session id (`pbs_…`) from Create Browser Session or List Browser Sessions.",
};

export const profileIdParam: Param = {
  key: "profileId",
  label: "Browser profile ID",
  type: "string",
  required: true,
  hint: "A browser profile id (`bp_…`) from List Browser Profiles.",
};
