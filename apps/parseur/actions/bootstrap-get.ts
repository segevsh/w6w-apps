import type { ActionDefinition } from "@w6w/types";
import { ParseurClient } from "../lib/client.ts";

/**
 * `GET /bootstrap` — static account-agnostic configuration: every enum's
 * human-readable choices, per-field max lengths, the inbound email domain
 * (`email_domain`, e.g. `"in.parseur.com"` — combine with a mailbox's
 * `email_prefix` to build its full address for `email-create`), and the
 * catalog of Parseur's pre-built "master" mailbox templates.
 *
 * Confirmed live on 2026-09-15: this endpoint answers `200` with **no**
 * `Authorization` header at all — it is genuinely public, unlike every other
 * operation in this API. `requiresAuth: false` reflects that; sending a
 * Connection's key alongside it is harmless but adds nothing.
 */
interface Input {
  // No parameters — this endpoint takes none.
  [key: string]: never;
}

const bootstrapGet: ActionDefinition<Input> = {
  key: "bootstrap-get",
  type: "read",
  resource: "account",
  title: "Get Bootstrap Config",
  description:
    "Get Parseur's static configuration: enum choices, field length limits, the inbound email " +
    "domain, and the catalog of pre-built master mailbox templates. This is a public endpoint.",
  requiresAuth: false,
  params: [],
  output: [
    { key: "choices", type: "object", label: "Enum choices" },
    { key: "email_domain", type: "string", label: "Inbound email domain" },
    { key: "master_parser_set", type: "array", label: "Pre-built master mailbox templates" },
  ],

  execute(_input, ctx) {
    return new ParseurClient(ctx).request("/bootstrap");
  },
};

export default bootstrapGet;
