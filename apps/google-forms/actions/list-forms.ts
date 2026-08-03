import type { ActionDefinition } from "@w6w/types";
import { FORM_MIME_TYPE, GoogleFormsClient } from "../lib/client.ts";

interface Input {
  nameContains?: string;
  includeTrashed?: boolean;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
}

/**
 * List Google Forms — Drive `files.list`, not a Forms API method.
 *
 * The Forms API has **no** list or search method: every one of its five methods
 * requires a `formId`. Enumerating forms is Drive's job, so this action queries
 * Drive v3 for files whose MIME type is `application/vnd.google-apps.form`.
 *
 * Scope caveat: under `drive.file` alone Drive only returns files this app
 * created or the user explicitly opened with it, so pre-existing forms are
 * invisible. The `drive.metadata.readonly` scope declared by this app's auth
 * methods is what makes the full listing work.
 */
const listForms: ActionDefinition<Input> = {
  key: "list-forms",
  type: "search",
  resource: "form",
  title: "List Forms",
  description: "List Google Forms in the connected account's Drive, optionally filtered by name.",
  params: [
    {
      key: "nameContains",
      label: "Name Contains",
      type: "string",
      hint: "Substring match on the Drive file name.",
    },
    { key: "includeTrashed", label: "Include Trashed", type: "boolean" },
    {
      key: "pageSize",
      label: "Page Size",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 1000 },
    },
    { key: "pageToken", label: "Page Token", type: "string" },
    {
      key: "orderBy",
      label: "Order By",
      type: "select",
      options: [
        { value: "name", label: "Name" },
        { value: "modifiedTime desc", label: "Recently modified" },
        { value: "createdTime desc", label: "Recently created" },
      ],
    },
  ],
  output: [
    { key: "files", type: "array", label: "Forms (id, name, timestamps, webViewLink)" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
    { key: "incompleteSearch", type: "boolean", label: "Search was incomplete" },
  ],

  execute(input, ctx) {
    const client = new GoogleFormsClient(ctx);
    const clauses = [`mimeType='${FORM_MIME_TYPE}'`];
    if (!input.includeTrashed) clauses.push("trashed=false");
    if (input.nameContains) {
      // Drive query strings escape a literal apostrophe with a backslash.
      clauses.push(`name contains '${input.nameContains.replaceAll("'", "\\'")}'`);
    }
    return client.request("/drive/v3/files", {
      query: {
        q: clauses.join(" and "),
        pageSize: input.pageSize ?? 100,
        pageToken: input.pageToken,
        orderBy: input.orderBy,
        fields:
          "nextPageToken,incompleteSearch,files(id,name,createdTime,modifiedTime,webViewLink)",
      },
    });
  },
};

export default listForms;
