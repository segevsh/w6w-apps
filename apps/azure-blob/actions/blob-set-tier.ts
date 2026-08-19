import type { ActionDefinition } from "@w6w/types";
import { BlobClient, blobName, containerName, query } from "../lib/client.ts";
import { BLOB_PARAM, CONTAINER_PARAM } from "../lib/params.ts";

/**
 * `PUT /{container}/{blob}?comp=tier` — move a blob between access tiers.
 *
 * ## Tiering down is instant; tiering back up is not
 *
 * Hot → Cool → Cold → Archive happens immediately. Coming **out** of Archive is
 * a *rehydration*: the blob stays unreadable while it runs, and it takes up to
 * **15 hours** at standard priority, or a couple of hours at high priority,
 * which costs more. Nothing about this call blocks or waits, so a workflow that
 * rehydrates and then reads will fail unless something checks in between —
 * `blob-get` reports `rehydrationStatus`.
 *
 * ## The minimum billed duration restarts on every move
 *
 * | Tier | Minimum |
 * | --- | --- |
 * | Cool | 30 days |
 * | Cold | 90 days |
 * | Archive | 180 days |
 *
 * Moving a blob to Archive and back a week later is billed **180 days of
 * Archive plus the retrieval**. A lifecycle policy that tiers aggressively and
 * then deletes can cost more than leaving everything in Hot, and nothing warns
 * about it — so this action puts the number in front of the caller and gates
 * the move into Archive.
 *
 * ## Archive is not "slow storage"
 *
 * It is offline. `blob-download` on an archived blob is a 409, not a slow
 * response, which is the property that breaks workflows written on the
 * assumption that a tier only affects price.
 */
const MINIMUM_DAYS: Record<string, number> = { Cool: 30, Cold: 90, Archive: 180 };

const action: ActionDefinition = {
  key: "blob-set-tier",
  type: "perform",
  resource: "blob",
  title: "Change a blob's tier",
  description:
    "Move a blob between Hot, Cool, Cold and Archive. Archive makes it UNREADABLE until " +
    "rehydrated, which takes up to 15 hours, and every move restarts the destination tier's " +
    "minimum billed duration.",
  idempotent: true,
  params: [
    CONTAINER_PARAM,
    BLOB_PARAM,
    {
      key: "tier",
      label: "Tier",
      type: "select",
      required: true,
      default: "Hot",
      options: [
        { value: "Hot", label: "Hot — no minimum" },
        { value: "Cool", label: "Cool — 30-day minimum" },
        { value: "Cold", label: "Cold — 90-day minimum" },
        { value: "Archive", label: "Archive — 180-day minimum, and offline until rehydrated" },
      ],
    },
    {
      key: "confirmArchive",
      label: "I accept that this blob becomes unreadable",
      type: "boolean",
      default: false,
      showIf: { "==": [{ var: "tier" }, "Archive"] },
      hint: "Reading it again means a rehydration of up to 15 hours, and 180 days are billed " +
        "whatever happens.",
    },
    {
      key: "rehydratePriority",
      label: "Rehydrate Priority",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "Standard — up to 15 hours" },
        { value: "High", label: "High — usually under an hour, and billed more" },
      ],
      hint: "Only meaningful when moving OUT of Archive.",
    },
  ],
  output: [
    { key: "tier", type: "string", label: "The tier it is moving to" },
    { key: "rehydrating", type: "boolean", label: "True when coming out of Archive" },
    { key: "readable", type: "boolean", label: "False once it is in Archive" },
    { key: "minimumDurationNote", type: "string", label: "What the move commits you to" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const container = containerName(p.container);
    const blob = blobName(p.blob);
    const tier = String(p.tier ?? "Hot").trim();

    if (tier === "Archive" && p.confirmArchive !== true) {
      throw new Error(
        "set `confirmArchive` — an archived blob cannot be read at all until it is rehydrated, " +
          "which takes up to 15 hours, and 180 days of Archive storage are billed for it whether " +
          "or not it stays there",
      );
    }

    const client = new BlobClient(ctx);
    // Whether this is a rehydration depends on where it is now, and only the
    // current tier says so.
    const before = await client.full(
      `/${encodeURIComponent(container)}/${encodeURIComponent(blob)}`,
      { method: "HEAD" },
    );
    const currentTier = before.headers["x-ms-access-tier"] ?? "";
    const rehydrating = currentTier === "Archive" && tier !== "Archive";

    const headers: Record<string, string> = { "x-ms-access-tier": tier };
    const priority = String(p.rehydratePriority ?? "").trim();
    if (rehydrating && priority) headers["x-ms-rehydrate-priority"] = priority;

    await client.request(
      `/${encodeURIComponent(container)}/${encodeURIComponent(blob)}`,
      { method: "PUT", query: query({ comp: "tier" }), headers },
    );

    const minimum = MINIMUM_DAYS[tier];
    const note = minimum
      ? `${tier} bills a minimum of ${minimum} days for this blob, starting now — moving it ` +
        `again or deleting it sooner is still charged for the full ${minimum} days`
      : undefined;

    ctx.log(
      tier === "Archive" || rehydrating ? "warn" : "info",
      tier === "Archive"
        ? "archived an Azure blob — it is now unreadable until rehydrated"
        : rehydrating
        ? `rehydrating an Azure blob from Archive — this takes ${
          priority === "High" ? "up to an hour" : "up to 15 hours"
        }, and it stays unreadable until it finishes`
        : "changed an Azure blob's tier",
      { name: blob, from: currentTier || undefined, to: tier },
    );

    return {
      tier,
      rehydrating,
      readable: tier !== "Archive" && !rehydrating,
      minimumDurationNote: note,
    };
  },
};

export default action;
