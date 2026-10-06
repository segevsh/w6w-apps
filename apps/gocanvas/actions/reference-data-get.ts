import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  referenceDataId: number;
  format?: string;
}

const referenceDataGet: ActionDefinition<Input> = {
  key: "reference-data-get",
  type: "read",
  resource: "reference_data",
  title: "Get Reference Data",
  description:
    "Fetch one reference data set with its rows. rows_with_index adds a gc_row_index column, which is what an update needs to address rows.",
  params: [
    idParam("referenceDataId", "Reference data ID"),
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "rows",
      options: [{ value: "rows", label: "rows" }, {
        value: "rows_with_index",
        label: "rows_with_index",
      }],
    },
  ],
  output: [
    { key: "data", type: "object", label: "The reference data with headers and rows" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(`/reference_data/${encodeId(input.referenceDataId)}`, {
      query: { format: input.format },
    });
  },
};

export default referenceDataGet;
