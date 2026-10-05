import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, DrataClient, seg, toList } from "../lib/client.ts";
import { opts, renewalScheduleTypes, workspaceIdParam } from "../lib/params.ts";

/**
 * `POST /workspaces/{workspaceId}/evidence` — create an evidence item with one
 * artifact: a link, a ticket, or a file uploaded earlier with `evidence-file-upload`.
 *
 * This is the **current** endpoint. The older `POST .../evidence-library` still
 * exists but its own description reads "Superseded by `POST /workspaces/{id}/evidence`",
 * and it is not covered here. A file is never sent in this call: the document says
 * "File artifacts must be pre-uploaded via the evidence-files endpoint and referenced
 * by `fileKey`".
 *
 * Every artifact needs `type` and `filedAt`, and the body's `artifacts` array is
 * required, so an item cannot be created empty. For several artifacts at once,
 * pass the full array as `artifacts`; it replaces the single-artifact fields.
 */
interface Input {
  workspaceId: number;
  name: string;
  description?: string;
  implementationGuidance?: string;
  ownerId?: number;
  controlIds?: string[] | string;
  renewalScheduleType?: string;
  renewalDate?: string;
  artifactType?: string;
  artifactName?: string;
  url?: string;
  fileKey?: string;
  ticketUrl?: string;
  filedAt?: string;
  artifacts?: unknown;
}

const ARTIFACT_TYPES = ["URL", "S3_FILE", "TICKET_PROVIDER"];

const action: ActionDefinition<Input> = {
  key: "evidence-create",
  type: "perform",
  resource: "evidence",
  title: "Create Evidence",
  description: "Create an evidence item with a URL, ticket or previously uploaded file artifact.",
  idempotent: false,
  params: [
    workspaceIdParam,
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 191 } },
    { key: "description", label: "Description", type: "text" },
    { key: "implementationGuidance", label: "Implementation guidance", type: "text" },
    { key: "ownerId", label: "Owner user ID", type: "number" },
    {
      key: "controlIds",
      label: "Control IDs",
      type: "string",
      hint: "Comma-separated control ids to link.",
    },
    {
      key: "renewalScheduleType",
      label: "Renewal schedule",
      type: "select",
      options: opts(renewalScheduleTypes),
    },
    { key: "renewalDate", label: "Renewal date", type: "date" },
    {
      key: "artifactType",
      label: "Artifact type",
      type: "select",
      options: opts(ARTIFACT_TYPES),
      default: "URL",
    },
    { key: "artifactName", label: "Artifact name", type: "string" },
    {
      key: "url",
      label: "URL",
      type: "string",
      hint: "Required for a URL artifact.",
    },
    {
      key: "fileKey",
      label: "File key",
      type: "string",
      hint: "Required for an S3_FILE artifact: the `fileKey` returned by Upload Evidence File.",
    },
    {
      key: "ticketUrl",
      label: "Ticket URL",
      type: "string",
      hint: "For a TICKET_PROVIDER artifact.",
    },
    {
      key: "filedAt",
      label: "Filed on",
      type: "date",
      hint: "When the artifact was originally created. Required for the single-artifact form.",
    },
    {
      key: "artifacts",
      label: "Artifacts (advanced)",
      type: "json",
      hint: "A full artifacts array; replaces the single-artifact fields above.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Evidence ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "artifacts", type: "array", label: "Artifacts" },
    { key: "artifactsCreated", type: "number", label: "Artifacts created" },
  ],

  execute(input, ctx) {
    let artifacts = asOptionalJson<unknown[]>(input.artifacts, "artifacts");
    if (!artifacts) {
      const type = input.artifactType ?? "URL";
      if (!ARTIFACT_TYPES.includes(type)) throw new Error(`unsupported artifact type ${type}`);
      if (!input.filedAt) throw new Error("filedAt is required for an artifact");
      if (type === "URL" && !input.url) throw new Error("url is required for a URL artifact");
      if (type === "S3_FILE" && !input.fileKey) {
        throw new Error("fileKey is required for an S3_FILE artifact");
      }
      if (type === "TICKET_PROVIDER" && !input.ticketUrl) {
        throw new Error("ticketUrl is required for a TICKET_PROVIDER artifact");
      }
      artifacts = [compact({
        type,
        artifactName: input.artifactName,
        url: type === "URL" ? input.url : undefined,
        fileKey: type === "S3_FILE" ? input.fileKey : undefined,
        ticketUrl: type === "TICKET_PROVIDER" ? input.ticketUrl : undefined,
        filedAt: input.filedAt,
      })];
    }
    const controlIds = toList(input.controlIds)?.map((s) => {
      const id = Number(s);
      if (!Number.isInteger(id)) throw new Error(`"${s}" is not a numeric control id`);
      return id;
    });
    return new DrataClient(ctx).post(
      `/workspaces/${seg(input.workspaceId)}/evidence`,
      compact({
        name: input.name,
        description: input.description,
        implementationGuidance: input.implementationGuidance,
        ownerId: input.ownerId,
        controlIds,
        renewalScheduleType: input.renewalScheduleType,
        renewalDate: input.renewalDate,
        artifacts,
      }),
    );
  },
};

export default action;
