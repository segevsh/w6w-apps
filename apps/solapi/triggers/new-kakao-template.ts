import listKakaoTemplates from "../actions/list-kakao-templates.ts";
import { readCursor, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c) over `list-kakao-templates`: GET /kakao/v2/templates/ is cursor-paged (`limit`, `startKey`/`nextKey`) and lists the account's AlimTalk templates, a small set that is read whole.
 */
export default snapshotTrigger({
  key: "new-kakao-template",
  title: "New Kakao Template",
  description: "The run gets each Kakao AlimTalk template newly registered in the account.",
  output: [
    { key: "templateId", type: "string", label: "Template ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "channelId", type: "string", label: "Channel ID" },
    { key: "status", type: "string", label: "Review status" },
    { key: "dateCreated", type: "string", label: "Created at" },
  ],
  sample: {
    templateId: "template-101",
    name: "Order shipped",
    channelId: "channel-101",
    status: "APPROVED",
    dateCreated: "2026-11-09T09:00:00.000Z",
  },
  rows: (ctx) => {
    return readCursor("new-kakao-template", listKakaoTemplates, ctx);
  },
  idOf: (r) => String(r.templateId ?? ""),
});
