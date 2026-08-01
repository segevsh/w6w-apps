import type { ActionDefinition } from "@w6w/types";
import { BoxClient } from "../lib/client.ts";

interface Input {
  itemType: "file" | "folder";
  itemId: string;
  access?: "open" | "company" | "collaborators";
  canDownload?: boolean;
  password?: string;
  unsharedAt?: string;
}

/**
 * Create (or replace) a shared link on a file or folder. Box models this as
 * setting the `shared_link` field on the item itself rather than a separate
 * "create link" endpoint — `PUT /files/{id}` or `PUT /folders/{id}` with a
 * `shared_link` object.
 *
 * https://developer.box.com/reference/put-files-id/
 * https://developer.box.com/reference/put-folders-id/
 */
const createSharedLink: ActionDefinition<Input> = {
  key: "create-shared-link",
  type: "perform",
  resource: "sharing",
  title: "Create Shared Link",
  description: "Create a shared link for a file or folder.",
  idempotent: true,
  params: [
    {
      key: "itemType",
      label: "Item Type",
      type: "select",
      required: true,
      default: "file",
      options: [
        { value: "file", label: "File" },
        { value: "folder", label: "Folder" },
      ],
    },
    { key: "itemId", label: "Item ID", type: "string", required: true },
    {
      key: "access",
      label: "Access",
      type: "select",
      options: [
        { value: "open", label: "Open (anyone with the link)" },
        { value: "company", label: "Company (enterprise members only)" },
        { value: "collaborators", label: "Collaborators only" },
      ],
      default: "open",
      hint:
        "Defaults to open (anyone with the link). Leaving this off Box's own request body defaults to the enterprise admin's setting, but this action always sends a value.",
    },
    {
      key: "canDownload",
      label: "Can download",
      type: "boolean",
      default: true,
      hint: "Only settable when access is Open or Company.",
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      hint: "At least 8 characters, including a number or non-alphanumeric character.",
    },
    {
      key: "unsharedAt",
      label: "Expires at",
      type: "datetime",
      hint: "ISO 8601 timestamp at which the link stops working.",
    },
  ],

  execute(input, ctx) {
    const client = new BoxClient(ctx);
    const sharedLink: Record<string, unknown> = { access: input.access ?? "open" };
    if (input.password) sharedLink.password = input.password;
    if (input.unsharedAt) sharedLink.unshared_at = input.unsharedAt;
    sharedLink.permissions = { can_download: input.canDownload ?? true };

    const path = input.itemType === "folder"
      ? `/folders/${input.itemId}`
      : `/files/${input.itemId}`;
    return client.request(path, {
      method: "PUT",
      body: { shared_link: sharedLink },
    });
  },
};

export default createSharedLink;
