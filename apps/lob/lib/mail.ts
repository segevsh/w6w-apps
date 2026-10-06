import type { HookContext } from "@w6w/types";
import { asAddress, asOptionalAddress, asOptionalJson, compact } from "./client.ts";

/** Fields every mailpiece create (postcard, letter, self-mailer, check) shares. */
export interface MailInput {
  to: unknown;
  from?: unknown;
  mailType?: string;
  sendDate?: string;
  mergeVariables?: unknown;
  metadata?: unknown;
  useType?: string;
  billingGroupId?: string;
  idempotencyKey?: string;
}

/**
 * Build the shared part of a mailpiece body.
 *
 * `from` is only added when the caller supplied one — a postcard and a self-mailer accept
 * no sender, a letter and a check require one, and each action enforces its own rule.
 */
export function mailBody(input: MailInput): Record<string, unknown> {
  if (!input.useType) {
    throw new Error(
      "Use type is required: Lob needs every mailpiece declared marketing or operational",
    );
  }
  return compact({
    to: asAddress(input.to, "To"),
    from: asOptionalAddress(input.from, "From"),
    mail_type: input.mailType,
    send_date: input.sendDate,
    merge_variables: asOptionalJson(input.mergeVariables, "Merge variables"),
    metadata: asOptionalJson(input.metadata, "Metadata"),
    use_type: input.useType,
    billing_group_id: input.billingGroupId,
  });
}

/**
 * The `Idempotency-Key` for a create: the caller's own key, else the run's invocation id.
 *
 * A mailpiece create is the one place a retry costs real money (a physical letter), and Lob
 * answers a repeated key within 24 hours with the first result instead of mailing again.
 */
export function idempotencyKeyFor(input: MailInput, ctx: HookContext): string | undefined {
  return input.idempotencyKey || ctx.invocation?.invocationId || undefined;
}
