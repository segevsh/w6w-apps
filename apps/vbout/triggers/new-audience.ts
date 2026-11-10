import audienceList from "../actions/audience-list.ts";
import { itemsOf, snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /1/emailmarketing/getaudiences.json` through `audience-list`: no paging parameters, every
 * audience of the account in one response (https://developers.vbout.com/scripts/openapi.json,
 * `EmailMarketing/GetAudiences`), so the whole collection is snapshot-diffed (additions only).
 */
export default snapshotTrigger({
  key: "new-audience",
  title: "New Audience",
  description: "The run gets each audience newly created in Vbout.",
  output: [
    { key: "id", type: "string", label: "Audience ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "148", name: "2014 NYC hotel show" },
  rows: async (_params, ctx) => itemsOf(await audienceList.execute({} as never, ctx), "audiences"),
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
});
