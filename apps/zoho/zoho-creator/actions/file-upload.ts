import type { ActionDefinition } from "@w6w/types";
import { environmentHeaders, ZohoCreatorClient } from "../lib/client.ts";
import {
  accountOwnerName,
  appLinkName,
  demoUserName,
  environmentParam,
  fieldLinkName,
  recordId,
  reportLinkName,
} from "../lib/params.ts";

interface Input {
  accountOwnerName: string;
  appLinkName: string;
  reportLinkName: string;
  recordId: string;
  fieldLinkName: string;
  file: unknown;
  environment?: string;
  demoUserName?: string;
}

interface Output {
  filename: string;
  filepath: string;
  message: string;
}

/**
 * `POST /creator/v2/data/<owner>/<app>/report/<report>/<record_id>/<field>/upload`
 * — Upload File. Needs `ZohoCreator.report.CREATE`. `multipart/form-data` with a
 * `file` field — the only way to set a file upload/image/audio/video/signature
 * field (`record-add`/`record-update`'s `data` cannot set these directly).
 * Verified against `upload-file.html`. Max file size is 50 MB (vendor-documented).
 */
const fileUpload: ActionDefinition<Input, Output> = {
  key: "file-upload",
  type: "perform",
  resource: "file",
  title: "Upload File",
  description: "Upload a file to a file upload/image/audio/video/signature field of an " +
    "existing record.",
  idempotent: false,
  params: [
    accountOwnerName,
    appLinkName,
    reportLinkName,
    recordId,
    fieldLinkName,
    { key: "file", label: "File", type: "file", required: true, hint: "Max 50MB." },
    environmentParam,
    demoUserName,
  ],
  output: [
    { key: "filename", type: "string", label: "Original filename" },
    { key: "filepath", type: "string", label: "Stored file path" },
    { key: "message", type: "string", label: "Message" },
  ],

  async execute(input, ctx) {
    const form = new FormData();
    // `input.file` arrives as whatever the host's `file` param resolves to (a
    // Blob/File in the reference runtime); FormData accepts it directly.
    form.append("file", input.file as Blob);

    const { filename, filepath, message } = await new ZohoCreatorClient(ctx).request<
      Output & { code: number }
    >(
      `/data/${encodeURIComponent(input.accountOwnerName)}/${
        encodeURIComponent(input.appLinkName)
      }/report/${encodeURIComponent(input.reportLinkName)}/${encodeURIComponent(input.recordId)}/${
        encodeURIComponent(input.fieldLinkName)
      }/upload`,
      { method: "POST", form, headers: environmentHeaders(input) },
    );
    return { filename, filepath, message };
  },
};

export default fileUpload;
