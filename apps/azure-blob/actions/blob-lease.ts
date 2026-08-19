import type { ActionDefinition } from "@w6w/types";
import { BlobClient, blobName, containerName, query } from "../lib/client.ts";
import { BLOB_PARAM, CONTAINER_PARAM } from "../lib/params.ts";

/**
 * `PUT /{container}/{blob}?comp=lease` — take or release an exclusive lock.
 *
 * ## Azure has a lock, and its neighbours do not
 *
 * S3 and Cloud Storage offer only optimistic concurrency: write with a
 * precondition and lose the race if somebody else got there first. Azure has
 * that too, *and* a real lease — a pessimistic lock on one blob, held for a
 * fixed time, which makes every other writer's request fail until it is
 * released.
 *
 * That is genuinely different, and it is the right tool for the case
 * preconditions handle badly: read a blob, compute something slow, write it
 * back, and be sure nobody changed it in the middle. With a precondition that
 * work is wasted when the race is lost; with a lease it never starts.
 *
 * ## The lease id is the capability, and losing it is a real state
 *
 * Acquiring returns an `x-ms-lease-id`. Every write while the lease is held
 * must carry it, and a workflow that acquires a lease and then fails without
 * releasing leaves the blob locked for the rest of the duration. **This is why
 * an infinite lease is a bad default and is not offered here** — a lost
 * infinite lease locks a blob until somebody breaks it by hand.
 *
 * ## Duration is 15 to 60 seconds, or infinite
 *
 * Nothing in between. A lease that needs to outlive a minute has to be renewed,
 * which is a call in its own right — so work longer than a minute should be
 * structured around renewals, or around a precondition instead.
 *
 * ## Breaking is not releasing
 *
 * `release` needs the lease id and frees the blob immediately. `break` does not
 * need the id — anyone can break a lease — but the blob stays locked for the
 * remainder of the lease period, during which no new lease can be taken. It is
 * the escape hatch for a lease whose holder is gone, not a way to jump a queue.
 */
const action: ActionDefinition = {
  key: "blob-lease",
  type: "perform",
  resource: "blob",
  title: "Lease a blob",
  description:
    "Take, renew, release or break an exclusive lock on a blob — a real lock, which S3 and Cloud " +
    "Storage do not have. Losing the lease id leaves the blob locked for the rest of its " +
    "duration, which is why infinite leases are not offered here.",
  idempotent: false,
  params: [
    CONTAINER_PARAM,
    BLOB_PARAM,
    {
      key: "operation",
      label: "Operation",
      type: "select",
      required: true,
      default: "acquire",
      options: [
        { value: "acquire", label: "Acquire — take the lock" },
        { value: "renew", label: "Renew — extend it, with the id" },
        { value: "release", label: "Release — free it now, with the id" },
        { value: "break", label: "Break — force it, without the id" },
      ],
    },
    {
      key: "duration",
      label: "Duration (seconds)",
      type: "number",
      default: 60,
      showIf: { "==": [{ var: "operation" }, "acquire"] },
      hint: "15 to 60. There is nothing in between, and infinite is deliberately not offered — a " +
        "lost infinite lease locks the blob until somebody breaks it by hand.",
    },
    {
      key: "leaseId",
      label: "Lease ID",
      type: "string",
      default: "",
      showIf: { "!=": [{ var: "operation" }, "acquire"] },
      hint: "From the acquire. Required to renew or release; `break` does not need it.",
    },
  ],
  output: [
    { key: "leaseId", type: "string", label: "The lock's id — every write must carry it" },
    { key: "operation", type: "string", label: "What was done" },
    { key: "leaseTime", type: "number", label: "Seconds left, after a break" },
    { key: "expiresInSeconds", type: "number", label: "How long the lease holds" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const container = containerName(p.container);
    const blob = blobName(p.blob);
    const operation = String(p.operation ?? "acquire");

    const headers: Record<string, string> = { "x-ms-lease-action": operation };

    if (operation === "acquire") {
      const duration = Math.trunc(Number(p.duration ?? 60));
      if (!(duration >= 15 && duration <= 60)) {
        throw new Error(
          `\`duration\` must be between 15 and 60 seconds — got ${duration}. Azure allows only ` +
            "that range or an infinite lease, and an infinite one is not offered here because " +
            "losing its id locks the blob until somebody breaks it by hand",
        );
      }
      headers["x-ms-lease-duration"] = String(duration);
    } else if (operation !== "break") {
      const leaseId = String(p.leaseId ?? "").trim();
      if (!leaseId) {
        throw new Error(
          `\`leaseId\` is required to ${operation} a lease — it is the capability, and without ` +
            "it the only way out is `break`, which leaves the blob locked for the rest of the " +
            "lease period",
        );
      }
      headers["x-ms-lease-id"] = leaseId;
    }

    const result = await new BlobClient(ctx).full(
      `/${encodeURIComponent(container)}/${encodeURIComponent(blob)}`,
      { method: "PUT", query: query({ comp: "lease" }), headers },
    );

    const leaseId = result.headers["x-ms-lease-id"];
    const leaseTime = result.headers["x-ms-lease-time"];

    ctx.log(
      operation === "break" ? "warn" : "info",
      operation === "break"
        ? "broke an Azure blob lease — the blob stays locked until the original period elapses"
        : `${operation}d a lease on an Azure blob`,
      { name: blob, operation },
    );

    return {
      leaseId,
      operation,
      leaseTime: leaseTime === undefined ? undefined : Number(leaseTime),
      expiresInSeconds: operation === "acquire" ? Math.trunc(Number(p.duration ?? 60)) : undefined,
    };
  },
};

export default action;
