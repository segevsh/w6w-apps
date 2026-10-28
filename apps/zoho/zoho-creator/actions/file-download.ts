import type { ActionDefinition } from "@w6w/types";
import { ZohoCreatorClient } from "../lib/client.ts";
import {
  accountOwnerName,
  appLinkName,
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
}

interface Output {
  content: string;
  contentType: string;
  base64: boolean;
}

/**
 * `GET /creator/v2/data/<owner>/<app>/report/<report>/<record_id>/<field>/download`
 * — Download File. Needs `ZohoCreator.report.READ`. Unlike every other action in
 * this app, a successful response is NOT the standard JSON envelope — it streams
 * the file's own bytes back, so this goes through
 * `ZohoCreatorClient#requestRaw` and returns the content base64-encoded (a hook's
 * return value must be JSON-serializable). Verified against `download-file.html`.
 * This action does not accept the `environment`/`demo_user_name` headers other
 * Creator endpoints do — `download-file.html`'s own header table omits them.
 */
const fileDownload: ActionDefinition<Input, Output> = {
  key: "file-download",
  type: "read",
  resource: "file",
  title: "Download File",
  description: "Download the file stored in a file upload/image/audio/video/signature field " +
    "of a record. Binary content is base64-encoded; text content (e.g. a plain-text file) " +
    "comes back as-is — see the `base64` output.",
  params: [accountOwnerName, appLinkName, reportLinkName, recordId, fieldLinkName],
  output: [
    { key: "content", type: "string", label: "File content" },
    { key: "contentType", type: "string", label: "Content type" },
    { key: "base64", type: "boolean", label: "Whether content is base64-encoded" },
  ],

  async execute(input, ctx) {
    const { content, contentType, base64 } = await new ZohoCreatorClient(ctx).requestRaw(
      `/data/${encodeURIComponent(input.accountOwnerName)}/${
        encodeURIComponent(input.appLinkName)
      }/report/${encodeURIComponent(input.reportLinkName)}/${encodeURIComponent(input.recordId)}/${
        encodeURIComponent(input.fieldLinkName)
      }/download`,
    );
    return { content, contentType, base64 };
  },
};

export default fileDownload;
