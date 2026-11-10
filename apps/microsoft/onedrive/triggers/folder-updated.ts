import { deltaTrigger } from "../lib/triggers.ts";

export default deltaTrigger({
  key: "folder-updated",
  title: "Folder Updated",
  description:
    "The run gets a folder that already existed and that Microsoft Graph delta reports as changed itself (renamed, moved or modified); parent folders of a changed item are not sent. Graph may also report a folder whose modified time moved because its contents changed.",
  change: "updated",
  facet: "folder",
});
