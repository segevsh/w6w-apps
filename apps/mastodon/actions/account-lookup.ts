import type { ActionDefinition } from "@w6w/types";
import { MastodonClient, query, stripHtml } from "../lib/client.ts";

/**
 * `GET /api/v1/accounts/lookup` — resolve a handle to an account.
 *
 * ## The handle has two forms and only one of them is unambiguous
 *
 * `@alice` is a *local* account on this instance. `@alice@example.social` is a
 * specific account anywhere. The bare form is what people type and what breaks
 * when the same name exists on two servers — which, across the fediverse, it
 * usually does. This action accepts both and says which it resolved.
 *
 * ## Ids are local, `acct` and `url` are not
 *
 * The `id` is meaningful on this instance alone. `acct` (`user@domain`) and
 * `url` identify the account across the network, and are what to store if
 * anything is kept between runs or between instances.
 *
 * ## Lookup does not fetch
 *
 * If this instance has never seen the account, lookup returns 404 rather than
 * going to find it. `status-search` with the account's URL and `resolve` on is
 * what pulls an unseen account in.
 */
const action: ActionDefinition = {
  key: "account-lookup",
  type: "read",
  resource: "account",
  title: "Look up an account",
  description:
    "Resolve a handle to an account. A bare `@name` means a LOCAL account — across the fediverse " +
    "the same name usually exists on several servers.",
  params: [
    {
      key: "acct",
      label: "Handle",
      type: "string",
      required: true,
      default: "",
      placeholder: "alice@example.social",
      hint: "`user@domain` for a specific account anywhere, or a bare name for a local one. The " +
        "leading @ is optional.",
    },
  ],
  output: [
    { key: "account", type: "object", label: "The account" },
    { key: "id", type: "string", label: "Its id on THIS instance" },
    { key: "acct", type: "string", label: "The federated handle" },
    { key: "url", type: "string", label: "Its profile URL" },
    { key: "local", type: "boolean", label: "Whether it lives on this instance" },
    { key: "note", type: "string", label: "The bio, with HTML stripped" },
    { key: "counts", type: "object", label: "Followers, following and statuses" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const acct = String(p.acct ?? "").trim().replace(/^@/, "");
    if (!acct) throw new Error("`acct` is required");

    const account = await new MastodonClient(ctx).request<{
      id?: string;
      acct?: string;
      url?: string;
      note?: string;
      followers_count?: number;
      following_count?: number;
      statuses_count?: number;
    }>("/api/v1/accounts/lookup", { query: query({ acct }) });

    // Mastodon returns a bare `acct` for a local account and `user@domain` for
    // a remote one — which is the only signal of which it is.
    const local = !String(account?.acct ?? "").includes("@");

    return {
      account,
      id: account?.id,
      acct: account?.acct,
      url: account?.url,
      local,
      note: stripHtml(account?.note),
      counts: {
        followers: account?.followers_count ?? 0,
        following: account?.following_count ?? 0,
        statuses: account?.statuses_count ?? 0,
      },
    };
  },
};

export default action;
