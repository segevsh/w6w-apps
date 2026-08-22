import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, compact, projectId } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /api/atlas/v2/groups/{groupId}/accessList` — let an address through.
 *
 * ## The body is a bare array
 *
 * Not an object with a field in it — the request body is the list of entries
 * itself, `[{...}]`. That is unusual enough that sending one entry as an
 * object is the obvious first attempt, and it is rejected. The action accepts
 * one entry and wraps it.
 *
 * ## `0.0.0.0/0` is gated, because it is the entry that ends the perimeter
 *
 * Adding it makes every cluster in the project reachable from every address on
 * the internet. There are real reasons to do it. There is no reason to do it
 * *accidentally*, and it is a single field's difference from adding one office
 * IP — so it needs an explicit acknowledgement here.
 *
 * ## An expiry is the right default for automation, and is not the API's
 *
 * `deleteAfterDate` removes the entry by itself. An access-list entry added by
 * a workflow to let a job connect should almost always expire, because nothing
 * else is going to remember to remove it. Atlas does not default it; this
 * action offers it prominently and warns when it is left off.
 *
 * ## The entry applies to the project, not to a cluster
 *
 * There is no per-cluster access list. Adding an address opens it to every
 * cluster the project holds, present and future.
 */
const action: ActionDefinition = {
  key: "access-list-add",
  type: "perform",
  resource: "access-list",
  title: "Add an IP access entry",
  description:
    "Let an address or CIDR block reach the project's clusters — ALL of them, present and " +
    "future. `0.0.0.0/0` is gated, and an entry with no expiry is one nothing will remove.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    {
      key: "value",
      label: "Address or CIDR",
      type: "string",
      required: true,
      default: "",
      placeholder: "203.0.113.4 or 203.0.113.0/24",
    },
    {
      key: "comment",
      label: "Comment",
      type: "string",
      required: true,
      default: "",
      hint: "Required here. An access list of unexplained CIDR blocks is one nobody can ever " +
        "safely prune.",
    },
    {
      key: "deleteAfterDate",
      label: "Expires At",
      type: "string",
      default: "",
      placeholder: "2026-09-01T00:00:00Z",
      hint: "ISO 8601. Strongly recommended for anything a workflow adds — nothing else will " +
        "remember to remove it.",
    },
    {
      key: "confirmOpenToInternet",
      label: "I am opening this project to the entire internet",
      type: "boolean",
      default: false,
      showIf: { "==": [{ var: "value" }, "0.0.0.0/0"] },
    },
  ],
  output: [
    { key: "added", type: "boolean", label: "Whether the entry was added" },
    { key: "value", type: "string", label: "What was added" },
    { key: "expiresAt", type: "string", label: "When it removes itself, if ever" },
    { key: "openToInternet", type: "boolean", label: "Whether this opened the whole internet" },
    { key: "entries", type: "array", label: "The entries the call returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);
    const value = String(p.value ?? "").trim();
    const comment = String(p.comment ?? "").trim();
    if (!value) throw new Error("`value` is required");
    if (!comment) {
      throw new Error(
        "`comment` is required — an access list of unexplained CIDR blocks is one nobody can " +
          "ever safely prune",
      );
    }

    const openToInternet = value === "0.0.0.0/0";
    if (openToInternet && p.confirmOpenToInternet !== true) {
      throw new Error(
        "set `confirmOpenToInternet` — `0.0.0.0/0` makes every cluster in this project " +
          "reachable from every address on the internet, and it is one character away from " +
          "adding a single office IP",
      );
    }

    const expiresAt = String(p.deleteAfterDate ?? "").trim();
    // A CIDR block goes in a different field to a bare address.
    const entry = compact({
      [value.includes("/") ? "cidrBlock" : "ipAddress"]: value,
      comment,
      deleteAfterDate: expiresAt || undefined,
    });

    const result = await new AtlasClient(ctx).list<Record<string, unknown>>(
      `/api/atlas/v2/groups/${id}/accessList`,
      // The body is the ARRAY itself, not an object wrapping it.
      { method: "POST", body: [entry] },
    );

    ctx.log(
      openToInternet || !expiresAt ? "warn" : "info",
      openToInternet
        ? "opened an Atlas project to the entire internet"
        : expiresAt
        ? "added an Atlas access-list entry"
        : "added an Atlas access-list entry with NO expiry — nothing will remove it",
      { openToInternet, expires: Boolean(expiresAt) },
    );

    return {
      added: true,
      value,
      expiresAt: expiresAt || undefined,
      openToInternet,
      entries: result.results,
    };
  },
};

export default action;
