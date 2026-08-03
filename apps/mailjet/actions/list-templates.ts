import type { ActionDefinition } from "@w6w/types";
import {
  MailjetClient,
  type MailjetEnvelope,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  ownerType?: string;
  purposes?: string;
  editMode?: number;
}

export interface MailjetTemplate {
  ID?: number;
  Name?: string;
  Author?: string;
  Copyright?: string;
  Description?: string;
  EditMode?: number;
  IsStarred?: boolean;
  IsTextPartGenerationEnabled?: boolean;
  Locale?: string;
  OwnerId?: number;
  OwnerType?: string;
  Presets?: string;
  Previews?: string;
  Purposes?: string[];
  CreatedAt?: string;
  LastUpdatedAt?: string;
}

/**
 * List stored templates, to find the `TemplateID` that `send-template-email`
 * needs.
 *
 * That is the point of this action: Mailjet's send API addresses templates by
 * numeric ID only, and the ID is not something a workflow author has to hand.
 * Without a listing you are copying integers out of the web UI's URL bar.
 *
 * `Purposes` is the filter that matters. Mailjet stores marketing, transactional
 * and automation templates in one resource, and an unfiltered listing mixes all
 * three — so a transactional workflow searching for its template wades through
 * every newsletter draft. Valid values per the reference are `marketing`,
 * `transactional` and `automation`.
 *
 * `OwnerType` (`apikey`, `user`, `global`) distinguishes your own templates from
 * Mailjet's built-in gallery; `global` is theirs, and it is large.
 */
const listTemplates: ActionDefinition<Input> = {
  key: "list-templates",
  type: "read",
  resource: "template",
  title: "List Templates",
  description: "List templates (GET /v3/REST/template) to find the numeric `TemplateID` that " +
    "`send-template-email` takes. Filter by `purposes` — marketing, transactional and " +
    "automation templates share one resource.",
  params: [
    {
      key: "purposes",
      label: "Purpose",
      type: "select",
      options: [
        { value: "transactional", label: "Transactional" },
        { value: "marketing", label: "Marketing" },
        { value: "automation", label: "Automation" },
      ],
      hint: "Unfiltered, the listing mixes all three.",
    },
    {
      key: "ownerType",
      label: "Owner type",
      type: "select",
      options: [
        { value: "apikey", label: "This API key" },
        { value: "user", label: "This user" },
        { value: "global", label: "Mailjet's global gallery" },
      ],
      hint: "`global` is Mailjet's own template gallery, not yours.",
    },
    {
      key: "editMode",
      label: "Edit mode",
      type: "select",
      options: [
        { value: 1, label: "Drag-and-drop builder" },
        { value: 2, label: "HTML" },
        { value: 3, label: "Saved section / snippet" },
        { value: 4, label: "MJML" },
      ],
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "Data", type: "array", label: "Templates" },
    { key: "Count", type: "number", label: "Count" },
    { key: "Total", type: "number", label: "Total" },
  ],

  execute(input, ctx) {
    const client = new MailjetClient(ctx);
    return client.v3<MailjetEnvelope<MailjetTemplate>>("/template", {
      query: {
        ...pageQuery(input),
        Purposes: input.purposes,
        OwnerType: input.ownerType,
        EditMode: input.editMode,
      },
    });
  },
};

export default listTemplates;
