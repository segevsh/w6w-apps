import type { ActionDefinition } from "@w6w/types";
import { compact, WebMergeClient } from "../lib/client.ts";

interface Input {
  fileName: string;
  fileUrl?: string;
  fileContents?: string;
  password?: string;
  userPassword?: string;
  permissions?: string[];
}

/**
 * Password-protect a PDF and set its permissions (POST /tools/encrypt_pdf).
 */
const pdfEncrypt: ActionDefinition<Input> = {
  key: "pdf-encrypt",
  type: "perform",
  resource: "file",
  title: "Encrypt PDF",
  description: "Password-protect a PDF and set its permissions (POST /tools/encrypt_pdf).",
  idempotent: true,
  params: [
    {
      key: "fileName",
      label: "File name",
      type: "string",
      required: true,
      hint: "e.g. contract.pdf",
    },
    {
      key: "fileUrl",
      label: "File URL",
      type: "string",
      hint: "Public URL of the file. Use this or File contents.",
    },
    {
      key: "fileContents",
      label: "File contents (base64)",
      type: "text",
      hint: "Base64 file data, as an alternative to File URL.",
    },
    {
      key: "password",
      label: "Owner password",
      type: "secret",
      hint: "Password required to edit permissions.",
    },
    {
      key: "userPassword",
      label: "User password",
      type: "secret",
      hint: "Password required to open the PDF.",
    },
    {
      key: "permissions",
      label: "Permissions",
      type: "multiselect",
      hint: "Allowed permissions.",
      options: [
        "Printing",
        "DegradedPrinting",
        "ModifyContents",
        "Assembly",
        "CopyContents",
        "FillIn",
        "AllFeatures",
      ].map((v) => ({ value: v, label: v })),
    },
  ],
  output: [
    { key: "file", type: "object", label: "{ contentBase64, contentType, sizeBytes }" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request("/tools/encrypt_pdf", {
      method: "POST",
      body: compact({
        file: compact({ name: input.fileName, url: input.fileUrl, contents: input.fileContents }),
        password: input.password,
        user_password: input.userPassword,
        permissions: input.permissions,
      }),
    });
  },
};

export default pdfEncrypt;
