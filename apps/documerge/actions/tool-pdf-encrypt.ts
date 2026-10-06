import type { ActionDefinition } from "@w6w/types";
import { asObject, compact, DocuMergeClient, fileRef } from "../lib/client.ts";

interface Input {
  fileName?: string;
  fileUrl?: string;
  fileContents?: string;
  password: string;
  userPassword: string;
  permissions: unknown;
}

const toolPdfEncrypt: ActionDefinition<Input> = {
  key: "tool-pdf-encrypt",
  type: "perform",
  resource: "tool",
  title: "Encrypt PDF",
  description: "Password-protect a PDF.",
  idempotent: true,
  params: [
    {
      key: "fileName",
      label: "File name",
      type: "string",
      hint: "Name of the file, e.g. report.pdf.",
    },
    {
      key: "fileUrl",
      label: "File URL",
      type: "string",
      hint: "A publicly reachable URL DocuMerge can download. Use this or File contents.",
    },
    {
      key: "fileContents",
      label: "File contents (base64)",
      type: "text",
      hint: "Base64-encoded file bytes, as an alternative to a URL.",
    },
    { key: "password", label: "Owner password", type: "secret", required: true },
    {
      key: "userPassword",
      label: "User password",
      type: "secret",
      required: true,
      hint: "Password needed to open the file.",
    },
    {
      key: "permissions",
      label: "Permissions",
      type: "json",
      required: true,
      hint: "JSON object of permissions to grant; `{}` for none.",
    },
  ],
  output: [
    { key: "contentBase64", type: "string", label: "The produced file, base64-encoded" },
    { key: "contentType", type: "string", label: "MIME type DocuMerge answered" },
    { key: "size", type: "number", label: "Size in bytes" },
  ],

  async execute(input, ctx) {
    const file = fileRef(input);
    return await new DocuMergeClient(ctx).file(
      `/api/tools/pdf/encrypt`,
      compact({
        file,
        password: input.password,
        user_password: input.userPassword,
        permissions: asObject(input.permissions, "Permissions"),
      }),
    );
  },
};

export default toolPdfEncrypt;
