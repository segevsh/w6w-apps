import { boxTrigger } from "../lib/triggers.ts";

/** A file uploaded into a watched folder (and its subfolders). */
const fileUploaded = boxTrigger({
  key: "file-uploaded",
  title: "File Uploaded",
  description:
    "Fires when a file is uploaded to a Box folder you choose. The run gets the file's id, name, the uploader and the time.",
  trigger: "FILE.UPLOADED",
});

export default fileUploaded;
