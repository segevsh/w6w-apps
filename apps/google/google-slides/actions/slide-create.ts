import type { ActionDefinition } from "@w6w/types";
import { batchUpdate, REVISION_PARAM, singleRequestBody } from "../lib/client.ts";

interface PlaceholderMapping {
  layoutPlaceholderType?: string;
  layoutPlaceholderIndex?: number;
  layoutPlaceholderObjectId?: string;
  objectId: string;
}

interface Input {
  presentationId: string;
  insertionIndex?: number;
  objectId?: string;
  predefinedLayout?: string;
  layoutId?: string;
  placeholderIdMappings?: PlaceholderMapping[];
  requiredRevisionId?: string;
}

/**
 * `createSlide` via `presentations.batchUpdate`.
 *
 * Two things this action encodes so callers don't have to rediscover them:
 *
 *   - `slideLayoutReference` is a **union**: either `predefinedLayout` (one of
 *     Google's twelve built-ins) or `layoutId` (an object ID of a layout in
 *     *this* deck). Sending both is meaningless, so `layoutId` wins if given
 *     and only one arm is ever emitted.
 *   - `placeholderIdMappings` is how you get a stable handle on the title/body
 *     boxes a layout creates. Without it Google mints random object IDs and the
 *     only way to find the title box is to re-read the slide. Each mapping
 *     names a placeholder on the *layout* — by `{type, index}` or by its object
 *     ID — and the ID you want the new placeholder on the *slide* to have. The
 *     discovery document notes it "can only be used when `slide_layout_reference`
 *     is specified", which is enforced below.
 *
 * `insertionIndex` is optional; omitting it appends. Not idempotent — running
 * it twice makes two slides (and fails the second time if you pinned
 * `objectId`, since IDs must be unique).
 */
const slideCreate: ActionDefinition<Input> = {
  key: "slide-create",
  type: "perform",
  resource: "slide",
  title: "Create Slide",
  description: "Add a slide, optionally from a layout and with named placeholder object IDs.",
  idempotent: false,
  params: [
    { key: "presentationId", label: "Presentation ID or URL", type: "string", required: true },
    {
      key: "insertionIndex",
      label: "Insertion Index",
      type: "number",
      hint: "Zero-based. Omit to append at the end.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "predefinedLayout",
      label: "Predefined Layout",
      type: "select",
      options: [
        { value: "BLANK", label: "Blank" },
        { value: "CAPTION_ONLY", label: "Caption only" },
        { value: "TITLE", label: "Title" },
        { value: "TITLE_AND_BODY", label: "Title and body" },
        { value: "TITLE_AND_TWO_COLUMNS", label: "Title and two columns" },
        { value: "TITLE_ONLY", label: "Title only" },
        { value: "SECTION_HEADER", label: "Section header" },
        { value: "SECTION_TITLE_AND_DESCRIPTION", label: "Section title and description" },
        { value: "ONE_COLUMN_TEXT", label: "One column text" },
        { value: "MAIN_POINT", label: "Main point" },
        { value: "BIG_NUMBER", label: "Big number" },
      ],
      hint:
        "Ignored when Layout Object ID is set. Omit both to inherit the current master's default layout.",
    },
    {
      key: "layoutId",
      label: "Layout Object ID",
      type: "string",
      advanced: true,
      hint:
        "The object ID of a layout already in this presentation. Takes precedence over Predefined Layout.",
    },
    {
      key: "objectId",
      label: "Slide Object ID",
      type: "string",
      advanced: true,
      hint:
        "Optional user-supplied ID for the new slide. Must be unique across the whole presentation, 5–50 chars, matching [a-zA-Z0-9_-:].",
    },
    {
      key: "placeholderIdMappings",
      label: "Placeholder ID Mappings",
      type: "json",
      advanced: true,
      hint:
        "Optional array of `{ layoutPlaceholderType, layoutPlaceholderIndex, objectId }` (or `{ layoutPlaceholderObjectId, objectId }`) so the placeholders created from the layout get IDs you chose. Requires a layout to be set.",
      placeholder: '[{"layoutPlaceholderType":"TITLE","layoutPlaceholderIndex":0,"objectId":"t1"}]',
    },
    REVISION_PARAM,
  ],
  output: [
    { key: "presentationId", type: "string", label: "Presentation ID" },
    { key: "replies", type: "array", label: "Replies — `createSlide.objectId` of the new slide" },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  execute(input, ctx) {
    const request: Record<string, unknown> = {};
    if (input.objectId) request.objectId = input.objectId;
    if (input.insertionIndex !== undefined) request.insertionIndex = input.insertionIndex;

    // The layout reference is a union — emit exactly one arm, never both.
    const layoutReference = input.layoutId
      ? { layoutId: input.layoutId }
      : input.predefinedLayout
      ? { predefinedLayout: input.predefinedLayout }
      : undefined;
    if (layoutReference) request.slideLayoutReference = layoutReference;

    if (input.placeholderIdMappings?.length) {
      if (!layoutReference) {
        throw new Error(
          "placeholderIdMappings requires a layout: set Predefined Layout or Layout Object ID",
        );
      }
      request.placeholderIdMappings = input.placeholderIdMappings.map((m) => {
        if (m.layoutPlaceholderObjectId) {
          return {
            layoutPlaceholderObjectId: m.layoutPlaceholderObjectId,
            objectId: m.objectId,
          };
        }
        return {
          layoutPlaceholder: {
            type: m.layoutPlaceholderType,
            index: m.layoutPlaceholderIndex ?? 0,
          },
          objectId: m.objectId,
        };
      });
    }

    return batchUpdate(
      ctx,
      input.presentationId,
      singleRequestBody({ createSlide: request }, {
        requiredRevisionId: input.requiredRevisionId,
      }),
    );
  },
};

export default slideCreate;
