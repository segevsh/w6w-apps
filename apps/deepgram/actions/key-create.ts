import type { ActionDefinition } from "@w6w/types";
import { compact, csv, DeepgramClient } from "../lib/client.ts";

/**
 * `POST /v1/projects/{id}/keys` — mint a new API key.
 *
 * ## The value comes back exactly once
 *
 * Deepgram returns the key in this response and never again. A workflow that
 * creates one and does not immediately store it somewhere has created an
 * unusable credential that still counts against the project — and the only fix
 * is to delete it and make another.
 *
 * So this action returns the key and **never logs it**, and the output is
 * labelled to say the value is not recoverable.
 *
 * ## Scopes and expiry are both decisions
 *
 * Scopes are fixed at creation: `member` reads, `admin` manages, `owner` does
 * everything including billing. A key minted with `owner` because it was
 * easier cannot be narrowed afterwards.
 *
 * `expirationDate` is optional and it should not be. A key created by an
 * automation for a temporary purpose, with no expiry, outlives the purpose
 * silently — so this action asks for a lifetime in days and says why.
 */
const action: ActionDefinition = {
  key: "key-create",
  type: "perform",
  resource: "key",
  title: "Create an API key",
  description:
    "Mint a key for this project. The value is returned ONCE and never again — store it in the " +
    "same run or delete it. Scopes are fixed at creation.",
  idempotent: false,
  params: [
    {
      key: "comment",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      hint: "What this key is for. It is the only thing an access review has to go on later.",
    },
    {
      key: "scopes",
      label: "Scopes",
      type: "string",
      required: true,
      default: "member",
      placeholder: "member",
      hint: "Comma-separated. `member` reads, `admin` manages, `owner` includes billing. Fixed " +
        "at creation — a key minted with owner cannot be narrowed later.",
    },
    {
      key: "expiresInDays",
      label: "Expires In (days)",
      type: "number",
      default: 0,
      hint: "Blank or 0 means never, which for an automation-created key is nearly always an " +
        "oversight rather than a decision.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated labels, for grouping usage by key.",
    },
  ],
  output: [
    { key: "key", type: "string", label: "The key value — NOT recoverable after this response" },
    { key: "api_key_id", type: "string", label: "The key's id, for listing and deleting" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const comment = String(p.comment ?? "").trim();
    if (!comment) throw new Error("`comment` is required — an unnamed key is unreviewable");
    const scopes = csv(p.scopes) ?? ["member"];

    const days = Number(p.expiresInDays ?? 0);
    let expirationDate: string | undefined;
    if (Number.isFinite(days) && days > 0) {
      expirationDate = new Date(Date.now() + days * 86_400_000).toISOString();
    }

    const client = new DeepgramClient(ctx);
    const created = await client.request<{ api_key_id?: string }>(
      `/v1/projects/${encodeURIComponent(client.projectId)}/keys`,
      {
        method: "POST",
        body: compact({
          comment,
          scopes,
          expiration_date: expirationDate,
          tags: csv(p.tags),
        }),
      },
    );

    // The id and the scopes; never the key, which is in this response only.
    ctx.log("info", "created a Deepgram API key", {
      apiKeyId: created?.api_key_id,
      scopes,
      expires: expirationDate ?? "never",
    });
    return created;
  },
};

export default action;
