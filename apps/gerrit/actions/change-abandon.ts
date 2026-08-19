import type { ActionDefinition } from "@w6w/types";
import { assertChangeId, compact, GerritClient } from "../lib/client.ts";

/**
 * `POST /a/changes/{id}/abandon` and `/restore` — close a change without
 * merging it, or bring it back.
 *
 * ## Abandoning is reversible, which makes it the safe way to clear a queue
 *
 * An abandoned change keeps its patch sets, its comments and its votes;
 * restoring puts it back exactly as it was. That makes "abandon anything
 * untouched for six months" a reasonable automation, in a way that deleting
 * would not be.
 *
 * ## The message is what the author reads
 *
 * Gerrit notifies the owner and reviewers. An abandon with no explanation
 * arrives as a bare notification that somebody's work has been closed, which
 * is a bad experience to automate — so this action asks for a message.
 *
 * ## It is not deletion, and Gerrit's deletion is a different thing entirely
 *
 * Changes can be deleted by an administrator, which removes the review history
 * as well. Nothing here does that: this app can close a change and reopen it,
 * and cannot destroy one.
 */
const action: ActionDefinition = {
  key: "change-abandon",
  type: "perform",
  resource: "change",
  title: "Abandon or restore a change",
  description:
    "Close a change without merging, or bring it back — REVERSIBLE, with patch sets, comments " +
    "and votes intact, which is what makes abandoning a stale queue a reasonable automation. " +
    "Gerrit notifies the author, so a message is required.",
  idempotent: true,
  params: [
    { key: "changeId", label: "Change", type: "string", required: true, default: "" },
    {
      key: "abandon",
      label: "Abandon",
      type: "boolean",
      default: true,
      hint: "Off restores an abandoned change, with everything it had.",
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      required: true,
      default: "",
      hint: "The author and reviewers are notified. An unexplained abandon is a poor thing to " +
        "automate.",
    },
  ],
  output: [
    { key: "changeId", type: "string", label: "Which change" },
    { key: "status", type: "string", label: "What it is now" },
    { key: "previousStatus", type: "string", label: "What it was" },
    { key: "changed", type: "boolean", label: "Whether this call changed anything" },
    { key: "subject", type: "string", label: "The change, for the record" },
    { key: "owner", type: "string", label: "Who is being notified" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const changeId = assertChangeId(p.changeId);
    const abandon = p.abandon !== false;
    const message = String(p.message ?? "").trim();
    if (!message) {
      throw new Error(
        "`message` is required — Gerrit notifies the change's owner and reviewers, and an " +
          "unexplained abandon arrives as a bare notification that somebody's work was closed",
      );
    }

    const client = new GerritClient(ctx);
    const before = await client.request<{
      status?: string;
      subject?: string;
      owner?: { name?: string; email?: string };
    }>(`/changes/${encodeURIComponent(changeId)}/detail`);

    const wanted = abandon ? "ABANDONED" : "NEW";
    if (before?.status === wanted) {
      return {
        changeId,
        status: before?.status,
        previousStatus: before?.status,
        changed: false,
        subject: before?.subject,
        owner: before?.owner?.name ?? before?.owner?.email,
      };
    }
    if (before?.status === "MERGED") {
      throw new Error(
        `change ${changeId} is already merged — a merged change cannot be abandoned, and undoing ` +
          "it means landing a revert",
      );
    }

    const updated = await client.request<{ status?: string }>(
      `/changes/${encodeURIComponent(changeId)}/${abandon ? "abandon" : "restore"}`,
      { method: "POST", body: compact({ message }) },
    );

    return {
      changeId,
      status: updated?.status ?? wanted,
      previousStatus: before?.status,
      changed: true,
      subject: before?.subject,
      owner: before?.owner?.name ?? before?.owner?.email,
    };
  },
};

export default action;
