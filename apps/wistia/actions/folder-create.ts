import type { ActionDefinition } from "@w6w/types";
import { compact, WistiaClient } from "../lib/client.ts";
import { folderOutput } from "./folder-get.ts";

interface Input {
  name: string;
  description?: string;
  adminEmail?: string;
  public?: boolean;
  anonymousCanUpload?: boolean;
  anonymousCanDownload?: boolean;
  personalLibrary?: boolean;
}

const folderCreate: ActionDefinition<Input> = {
  key: "folder-create",
  type: "perform",
  resource: "folder",
  title: "Create Folder",
  description: "Create a folder (previously called a project).",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "adminEmail",
      label: "Owner email",
      type: "string",
      hint: "Defaults to the Wistia account owner.",
    },
    { key: "public", label: "Public", type: "boolean" },
    { key: "anonymousCanUpload", label: "Anonymous can upload", type: "boolean" },
    { key: "anonymousCanDownload", label: "Anonymous can download", type: "boolean" },
    {
      key: "personalLibrary",
      label: "Create in My Library",
      type: "boolean",
      hint: "Creates the folder in the token user's personal library instead of a shared folder.",
    },
  ],
  output: [...folderOutput],

  execute(input, ctx) {
    if (!input.name?.trim()) throw new Error("name is required");
    // The request body is camelCase while every response is snake_case — both as documented.
    return new WistiaClient(ctx).json("/folders", {
      method: "POST",
      body: compact({
        name: input.name.trim(),
        description: input.description,
        adminEmail: input.adminEmail,
        public: input.public,
        anonymousCanUpload: input.anonymousCanUpload,
        anonymousCanDownload: input.anonymousCanDownload,
        personalLibrary: input.personalLibrary,
      }),
    });
  },
};

export default folderCreate;
