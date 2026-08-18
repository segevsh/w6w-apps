import type { ActionDefinition } from "@w6w/types";
import { AmplitudeClient, compact, csv } from "../lib/client.ts";

/**
 * `POST /api/2/deletions/users` — the GDPR erasure request.
 *
 * ## This is genuinely irreversible
 *
 * Amplitude deletes every event and every property for the named users, across
 * the project, permanently. There is no undo, no soft delete and no recycle
 * bin — that is the entire point of the endpoint, and it is why this action
 * requires an explicit acknowledgement rather than trusting the parameters.
 *
 * ## It is asynchronous, and "accepted" is not "done"
 *
 * The response confirms the request was queued. The actual deletion runs on
 * Amplitude's schedule and takes **up to 30 days**. A workflow that deletes and
 * then verifies by querying will find the user still there, and that is
 * expected rather than a failure.
 *
 * ## It needs a permission the ordinary keys may not have
 *
 * The deletion API requires the account to have been granted access to it, and
 * on a project without that it answers with the same `Invalid API Key` shape
 * everything else uses — so a rejection here is more likely to be an
 * entitlement than a credential.
 *
 * ## `requester` is not decoration
 *
 * Amplitude records who asked, and for a regulatory deletion that audit trail is
 * usually the reason the request is being made at all.
 */
const action: ActionDefinition = {
  key: "user-delete",
  type: "perform",
  resource: "user",
  title: "Delete users (GDPR)",
  description:
    "Erase every event and property for named users, permanently. Asynchronous — it takes up to " +
    "30 days, so the user remaining queryable afterwards is expected.",
  idempotent: true,
  params: [
    {
      key: "userIds",
      label: "User IDs",
      type: "string",
      default: "",
      hint: "Comma-separated. Give these or Amplitude ids.",
    },
    {
      key: "amplitudeIds",
      label: "Amplitude IDs",
      type: "string",
      default: "",
      hint: "Comma-separated internal ids, from `user-search`. More precise, because one person " +
        "can be several.",
    },
    {
      key: "requester",
      label: "Requested By",
      type: "string",
      required: true,
      default: "",
      hint: "An email address. Amplitude records it, and for a regulatory deletion that audit " +
        "trail is usually the point.",
    },
    {
      key: "confirmPermanentDeletion",
      label: "I understand this is permanent",
      type: "boolean",
      required: true,
      default: false,
      hint: "There is no undo and no recovery. Every event for these users is erased across the " +
        "whole project.",
    },
    {
      key: "ignoreInvalidId",
      label: "Ignore Unknown IDs",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "On, ids Amplitude does not recognise are skipped instead of failing the request.",
    },
  ],
  output: [
    { key: "requested", type: "boolean", label: "Queued — not yet done" },
    { key: "userCount", type: "number", label: "Users named" },
    { key: "response", type: "object", label: "Amplitude's own body" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userIds = csv(p.userIds);
    const amplitudeIds = csv(p.amplitudeIds);
    if (!userIds && !amplitudeIds) {
      throw new Error("give `userIds` or `amplitudeIds`");
    }
    const requester = String(p.requester ?? "").trim();
    if (!requester) throw new Error("`requester` is required — Amplitude records who asked");

    if (p.confirmPermanentDeletion !== true) {
      throw new Error(
        "set `confirmPermanentDeletion` — this erases every event and property for these users " +
          "across the whole project, permanently. There is no undo, no soft delete and no " +
          "recovery from a backup",
      );
    }

    const count = (userIds?.length ?? 0) + (amplitudeIds?.length ?? 0);
    ctx.log("warn", "requesting permanent user deletion from Amplitude", { userCount: count });

    const result = await new AmplitudeClient(ctx).dashboard<Record<string, unknown>>(
      "/api/2/deletions/users",
      {
        method: "POST",
        body: compact({
          user_ids: userIds,
          amplitude_ids: amplitudeIds,
          requester,
          ignore_invalid_id: p.ignoreInvalidId === true ? "true" : undefined,
        }),
      },
    );

    // Queued, not done — Amplitude takes up to 30 days.
    return { requested: true, userCount: count, response: result };
  },
};

export default action;
