import action from "../actions/list-articles.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-article",
  title: "New Knowledge Base Article",
  description: "The run gets each newly created knowledge base article (newest first).",
  action,
  output: [
    { key: "Uid", type: "string", label: "Article Uid" },
    { key: "Title", type: "string", label: "Title" },
    { key: "Created", type: "string", label: "Created" },
  ],
  sample: { Uid: "kb3Rt9Zx", Title: "Getting started", Created: "2026-11-10T09:00:00Z" },
});
