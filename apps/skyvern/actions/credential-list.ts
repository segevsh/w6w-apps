import type { ActionDefinition } from "@w6w/types";
import { compact, SkyvernClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v1/credentials` — stored credentials. The response carries the username (password
 * credentials) or masked card details, never the password or secret itself.
 */
interface Input {
  page?: number;
  pageSize?: number;
  vaultType?: string;
  credentialType?: string;
  search?: string;
}

const credentialList: ActionDefinition<Input> = {
  key: "credential-list",
  type: "search",
  resource: "credential",
  title: "List Credentials",
  description:
    "List stored credentials by name and type, to reference them in an agent. Secrets are never returned.",
  params: [
    ...paginationParams(10),
    {
      key: "vaultType",
      label: "Vault",
      type: "select",
      options: [
        { value: "skyvern", label: "Skyvern" },
        { value: "bitwarden", label: "Bitwarden" },
        { value: "azure_vault", label: "Azure Key Vault" },
        { value: "gcp", label: "Google Cloud" },
        { value: "custom", label: "Custom" },
      ],
    },
    {
      key: "credentialType",
      label: "Credential type",
      type: "select",
      options: [
        { value: "password", label: "Password" },
        { value: "credit_card", label: "Credit card" },
        { value: "secret", label: "Secret" },
      ],
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Case-insensitive across name, username, secret label and card details.",
    },
  ],
  output: [
    { key: "credentials", type: "array", label: "Credentials (credential_id, name, type, …)" },
    { key: "count", type: "number", label: "Count on this page" },
  ],

  async execute(input, ctx) {
    const credentials = await new SkyvernClient(ctx).json<unknown[]>("/v1/credentials", {
      query: compact({
        page: input.page,
        page_size: input.pageSize,
        vault_type: input.vaultType,
        credential_type: input.credentialType,
        search: input.search,
      }),
    });
    return { credentials: credentials ?? [], count: (credentials ?? []).length };
  },
};

export default credentialList;
