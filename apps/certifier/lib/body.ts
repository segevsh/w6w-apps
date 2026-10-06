import { asObject, compact } from "./client.ts";

export interface CredentialInput {
  groupId: string;
  recipientName: string;
  recipientEmail?: string;
  issueDate?: string;
  expiryDate?: string;
  customAttributes?: unknown;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Certifier accepts "only YYYY-MM-DD" for both dates; fail before the round trip. */
export function dateOrThrow(value: string | undefined, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const v = String(value).trim();
  if (!DATE.test(v)) throw new Error(`${label} must be YYYY-MM-DD`);
  return v;
}

/** Body shared by `POST /credentials` and `POST /credentials/create-issue-send`. */
export function credentialBody(input: CredentialInput): Record<string, unknown> {
  if (!input.groupId?.trim()) throw new Error("groupId is required");
  if (!input.recipientName?.trim()) throw new Error("recipientName is required");
  return compact({
    groupId: input.groupId.trim(),
    recipient: compact({ name: input.recipientName, email: input.recipientEmail?.trim() }),
    issueDate: dateOrThrow(input.issueDate, "issueDate"),
    expiryDate: dateOrThrow(input.expiryDate, "expiryDate"),
    customAttributes: asObject(input.customAttributes, "customAttributes"),
  });
}
