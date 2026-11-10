import quoteList from "../actions/quote-list.ts";
import { visualIdTrigger } from "../lib/triggers.ts";

// Printavo's quotes connection takes `sortOn: VISUAL_ID, sortDescending: true` (the visual ID is the
// sequential order number shown in Printavo,
// https://www.printavo.com/docs/api/v2/, verified 2026-11-10); the sort enum has no created-at
// key, so page 1 of 100 by descending visual ID is the newest-first feed.
export default visualIdTrigger({
  key: "new-quote",
  title: "New Quote",
  description: "The run gets each newly created quote.",
  action: quoteList as never,
  output: [
    { key: "id", type: "string", label: "Quote ID" },
    { key: "visualId", type: "string", label: "Visual ID (order number)" },
    { key: "nickname", type: "string", label: "Nickname" },
    { key: "total", type: "number", label: "Total" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "quote-sample-1",
    visualId: "1042",
    nickname: "Spring shirts",
    total: 480,
    createdAt: "2026-11-10T09:00:00Z",
  },
});
