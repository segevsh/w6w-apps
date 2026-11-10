import type { OutputField } from "@w6w/types";

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

/** Docusign requires `from_date`; the trigger looks back this far for envelopes. */
export const LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

export const fromDate = (): string => new Date(clock.now() - LOOKBACK_MS).toISOString();

export const envelopeOutput: OutputField[] = [
  { key: "envelopeId", type: "string", label: "Envelope ID" },
  { key: "status", type: "string", label: "Status" },
  { key: "emailSubject", type: "string", label: "Email subject" },
  { key: "createdDateTime", type: "string", label: "Created at" },
  { key: "statusChangedDateTime", type: "string", label: "Status changed at" },
];

export const envelopeSample = {
  envelopeId: "9f5c1b1e-0000-4000-8000-000000000001",
  status: "sent",
  emailSubject: "Please sign the master services agreement",
  createdDateTime: "2026-11-09T10:00:00.0000000Z",
  statusChangedDateTime: "2026-11-09T10:00:00.0000000Z",
};

export const envelopeItems = (result: unknown) =>
  (result as { envelopes?: unknown[] }).envelopes ?? [];
