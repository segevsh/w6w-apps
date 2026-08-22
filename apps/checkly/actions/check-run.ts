import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient, csv, json } from "../lib/client.ts";

/**
 * `POST /v1/check-sessions/trigger` — verified against Checkly's OpenAPI
 * document (`postV1ChecksessionsTrigger`).
 *
 * **Omitting the target does not mean "nothing".** Checkly's own description:
 * *"Starts a check session for each check that matches the provided target
 * filters. If no filters are given, matches all eligible checks."* On an
 * account with a few hundred monitors that is a few hundred simultaneous runs,
 * billed as such, from every configured location.
 *
 * So this app refuses the ambiguity: name checks or tags, or tick the option
 * that says you meant the whole account.
 *
 * **The response is a session, not a result.** The runs are starting; whether
 * they passed is in `check-result-list` afterwards, or by polling the session.
 * A workflow that treats this call's success as "the site is fine" is testing
 * nothing.
 */
const action: ActionDefinition = {
  key: "check-run",
  type: "perform",
  resource: "check-session",
  title: "Run checks now",
  description: "Trigger an ad-hoc run of some checks — or, deliberately, all of them.",
  // Two triggers run the checks twice, and each run is billed.
  idempotent: false,
  params: [
    {
      key: "checkIds",
      label: "Check IDs",
      type: "string",
      default: "",
      hint: "Comma-separated. The narrowest target.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      hint: "Comma-separated. Runs every check carrying them.",
    },
    {
      key: "runEverything",
      label: "Run every check in the account",
      type: "boolean",
      default: false,
      hint: "With no ids and no tags, Checkly runs EVERY eligible check. This makes that an " +
        "explicit choice rather than an omission.",
    },
    {
      key: "target",
      label: "Advanced Target",
      type: "json",
      default: "",
      placeholder: '{"checkIds":["c1"],"tags":[["production"]]}',
      hint: "Passed through as Checkly's `target` object, for filters this form does not name.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Check session id" },
    { key: "queued", type: "boolean", label: "Started — NOT a statement that anything passed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const checkIds = csv(p.checkIds);
    const tags = csv(p.tags);
    const advanced = json(p.target, "target");
    const runEverything = p.runEverything === true;

    if (!checkIds && !tags && advanced === undefined && !runEverything) {
      throw new Error(
        "no target — name `checkIds` or `tags`, or tick `runEverything` to run every check in " +
          "the account",
      );
    }
    if ((checkIds || tags || advanced !== undefined) && runEverything) {
      throw new Error(
        "pick one target — naming checks and also asking to run everything says two things",
      );
    }

    // Checkly's tag filter is an array of arrays: OR of ANDs.
    const target = advanced !== undefined ? advanced : runEverything ? {} : {
      ...(checkIds ? { checkIds } : {}),
      ...(tags ? { tags: [tags] } : {}),
    };

    ctx.log(runEverything ? "warn" : "info", "triggering a Checkly check session", {
      scope: runEverything ? "every check in the account" : "targeted",
    });

    const result = await new ChecklyClient(ctx).request<Record<string, unknown>>(
      "/v1/check-sessions/trigger",
      { method: "POST", body: { target } },
    );
    return { ...result, queued: true };
  },
};

export default action;
