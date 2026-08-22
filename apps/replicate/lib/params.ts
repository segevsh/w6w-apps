import type { Param } from "@w6w/types";

/**
 * The synchronous-mode opt-in, shared by the prediction-creating actions.
 *
 * Off, a prediction comes back `starting` and the workflow polls. On,
 * Replicate holds the connection — but only up to 60 seconds, after which it
 * gives up and returns `starting` anyway. Both halves are in the hint, because
 * treating a waited prediction as necessarily finished is the mistake this
 * parameter invites.
 */
export const WAIT_PARAM: Param = {
  key: "waitSeconds",
  label: "Wait For Output (seconds)",
  type: "number",
  default: 0,
  hint: "0 returns immediately with `status: starting`. 1–60 asks Replicate to hold the " +
    "connection — but if the model is slower it STILL returns `starting`, so check the status.",
};

/** Paging, shared by every list action. */
export const LIST_PARAMS: Param[] = [
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Follow Replicate's cursor through every page.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    hint: "Maximum results when Return All is off.",
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];
