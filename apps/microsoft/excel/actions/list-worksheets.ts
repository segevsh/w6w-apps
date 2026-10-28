import type { ActionDefinition } from "@w6w/types";
import {
  GraphClient,
  odataList,
  type PagedResult,
  sessionHeaders,
  workbookPath,
  type WorkbookRef,
} from "../lib/client.ts";
import { collectionParams, listOutput, sessionIdParam, workbookParams } from "../lib/params.ts";

interface Input extends WorkbookRef {
  select?: string[];
  top?: number;
  skip?: number;
  sessionId?: string;
}

interface Worksheet {
  id?: string;
  name?: string;
  position?: number;
  visibility?: string;
}

/**
 * `GET /me/drive/items/{id}/workbook/worksheets`
 * `GET /me/drive/root:/{item-path}:/workbook/worksheets`
 *
 * https://learn.microsoft.com/en-us/graph/api/worksheet-list
 *
 * Returns `id`, `name`, `position` and `visibility` (`Visible` | `Hidden` |
 * `VeryHidden`) per sheet. The `id` is the stable handle — the reference notes
 * it "remains the same even when the worksheet is renamed or moved", which the
 * name obviously does not.
 *
 * Excel collections carry no `@odata.nextLink`; Microsoft's guidance for these
 * is `$top` + `$skip`, so `nextLink` is absent from the output for this family.
 */
const listWorksheets: ActionDefinition<Input, PagedResult<Worksheet>> = {
  key: "list-worksheets",
  type: "read",
  resource: "worksheet",
  title: "List Worksheets",
  description: "List the worksheets in a workbook, with their ids, positions and visibility.",
  params: [
    ...workbookParams(),
    ...collectionParams({ defaultTop: 50 }),
    sessionIdParam,
  ],
  output: listOutput,

  async execute(input, ctx): Promise<PagedResult<Worksheet>> {
    const client = new GraphClient(ctx);
    return await client.page<Worksheet>(`${workbookPath(input)}/worksheets`, {
      query: {
        $select: odataList(input.select),
        $top: input.top,
        $skip: input.skip,
      },
      headers: sessionHeaders(input.sessionId),
    });
  },
};

export default listWorksheets;
