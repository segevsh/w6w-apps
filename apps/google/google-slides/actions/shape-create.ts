import type { ActionDefinition } from "@w6w/types";
import {
  batchUpdate,
  buildElementProperties,
  type ElementPlacement,
  PLACEMENT_PARAMS,
  REVISION_PARAM,
  singleRequestBody,
} from "../lib/client.ts";

interface Input extends ElementPlacement {
  presentationId: string;
  shapeType: string;
  objectId?: string;
  requiredRevisionId?: string;
}

/**
 * `createShape` via `presentations.batchUpdate` — most often used to add a
 * `TEXT_BOX` that a following `text-insert` fills.
 *
 * `shapeType` is an enum of **142** values (every flowchart symbol, every arrow,
 * every star). Rendering all of them as a dropdown would be unusable, so the
 * select below offers the dozen that account for nearly all real use and the
 * field stays a free string: any other value from Google's `Type` enum is
 * accepted and passed through unchanged. `TYPE_UNSPECIFIED` and `CUSTOM` are
 * deliberately not offered — the first is invalid input, the second is only
 * ever produced by Google when reading an imported deck.
 *
 * Size and position are optional here too; omitting them lets Google place the
 * shape. The nested shape they fold into is taken from Google's own sample —
 * see `buildElementProperties`.
 */
const shapeCreate: ActionDefinition<Input> = {
  key: "shape-create",
  type: "perform",
  resource: "element",
  title: "Create Shape",
  description:
    "Add a shape — a text box, rectangle, ellipse, arrow or any other Slides shape type.",
  idempotent: false,
  params: [
    { key: "presentationId", label: "Presentation ID or URL", type: "string", required: true },
    {
      key: "shapeType",
      label: "Shape Type",
      type: "select",
      required: true,
      default: "TEXT_BOX",
      options: [
        { value: "TEXT_BOX", label: "Text box" },
        { value: "RECTANGLE", label: "Rectangle" },
        { value: "ROUND_RECTANGLE", label: "Rounded rectangle" },
        { value: "ELLIPSE", label: "Ellipse" },
        { value: "TRIANGLE", label: "Triangle" },
        { value: "DIAMOND", label: "Diamond" },
        { value: "RIGHT_ARROW", label: "Right arrow" },
        { value: "LEFT_ARROW", label: "Left arrow" },
        { value: "STAR_5", label: "5-point star" },
        { value: "CLOUD", label: "Cloud" },
        { value: "WEDGE_RECTANGLE_CALLOUT", label: "Speech callout" },
        { value: "FLOW_CHART_PROCESS", label: "Flowchart: process" },
        { value: "FLOW_CHART_DECISION", label: "Flowchart: decision" },
      ],
      hint:
        "Any value from Google's 142-member shape Type enum is accepted, not just the ones listed.",
    },
    ...PLACEMENT_PARAMS,
    {
      key: "objectId",
      label: "Shape Object ID",
      type: "string",
      advanced: true,
      hint:
        "Optional user-supplied ID for the new shape — set it if a later action needs to address this shape.",
    },
    REVISION_PARAM,
  ],
  output: [
    { key: "presentationId", type: "string", label: "Presentation ID" },
    { key: "replies", type: "array", label: "Replies — `createShape.objectId` of the new shape" },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  execute(input, ctx) {
    const request: Record<string, unknown> = {
      shapeType: input.shapeType,
      elementProperties: buildElementProperties(input),
    };
    if (input.objectId) request.objectId = input.objectId;

    return batchUpdate(
      ctx,
      input.presentationId,
      singleRequestBody({ createShape: request }, {
        requiredRevisionId: input.requiredRevisionId,
      }),
    );
  },
};

export default shapeCreate;
