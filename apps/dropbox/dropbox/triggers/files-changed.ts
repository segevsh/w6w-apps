import { filesChangedTrigger } from "../lib/triggers.ts";

/** Dropbox's change notification (App Console webhook), signed with the app secret. */
const filesChanged = filesChangedTrigger({
  key: "files-changed",
  title: "Files Changed (Webhook)",
  description:
    "Fires when Dropbox reports new changes in an account that authorized your app. The run gets the account id; read the changes with List Folder.",
});

export default filesChanged;
