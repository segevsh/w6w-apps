import type { ActionDefinition } from "@w6w/types";
import { FireberryClient, PAGE_OUTPUT, pageOutput, type RecordPage, seg } from "../lib/client.ts";
import { PAGENUMBER_PARAM, PAGESIZE_PARAM } from "../lib/params.ts";

interface Input {
  objectNumber: number;
  recordId: string;
  relatedObjectNumber: number;
  pageSize?: number;
  pageNumber?: number;
}

/** `GET /api/record/{objectType}/{id}/{relatedObjectType}`. */
const recordListRelated: ActionDefinition<Input> = {
  key: "record-list-related",
  type: "search",
  resource: "record",
  title: "List Related Records",
  description:
    "List the records of one object that are related to a given record, e.g. the contacts of an account. Both objects are addressed by number.",
  params: [
    {
      key: "objectNumber",
      label: "Object number",
      type: "number",
      required: true,
      hint: "Number of the object the record belongs to (account is 1).",
      validation: { min: 1, integer: true },
    },
    {
      key: "recordId",
      label: "Record ID",
      type: "string",
      required: true,
      hint: "The record's GUID.",
    },
    {
      key: "relatedObjectNumber",
      label: "Related object number",
      type: "number",
      required: true,
      hint: "Number of the related object whose records to list.",
      validation: { min: 1, integer: true },
    },
    PAGESIZE_PARAM,
    PAGENUMBER_PARAM,
  ],
  output: PAGE_OUTPUT as unknown as ActionDefinition["output"],

  async execute(input, ctx) {
    const body = await new FireberryClient(ctx).request<RecordPage>(
      "GET",
      `/api/record/${seg(input.objectNumber)}/${seg(input.recordId)}/${
        seg(input.relatedObjectNumber)
      }`,
      { query: { pagesize: input.pageSize, pagenumber: input.pageNumber } },
    );
    return pageOutput(body);
  },
};

export default recordListRelated;
