import { webhookTrigger } from "../lib/triggers.ts";

/** Notion webhook event `file_upload.upload_failed`. */
export default webhookTrigger({
  key: "file-upload-upload-failed",
  title: "File Upload Failed",
  description:
    "Fires when importing an external file into Notion fails. The run gets the event, the file upload id and the import result with the error.",
  eventTypes: ["file_upload.upload_failed"],
  sample: {
    "id": "367cba44-b6f3-4c92-81e7-6a2e9659efd4",
    "type": "file_upload.upload_failed",
    "timestamp": "2026-11-10T09:00:00.000Z",
    "workspaceId": "13950b26-c203-4f3b-b97d-93ec06319565",
    "workspaceName": "Acme Workspace",
    "subscriptionId": "29d75c0d-5546-4414-8459-7b7a92f1fc4b",
    "integrationId": "0ef2e755-4912-8096-91c1-00376a88a5ca",
    "entityId": "153104cd-477e-809d-8dc4-ff2d96ae3090",
    "entityType": "file_upload",
    "authors": [
      {
        "id": "c7c11cca-1d73-471d-9b6e-bdef51470190",
        "type": "person",
      },
    ],
    "data": {
      "file_import_result": {
        "type": "error",
        "imported_time": "2026-11-10T09:00:00.000Z",
        "error": {
          "type": "download_error",
          "code": "download_failed",
          "message": "The file could not be downloaded from the external URL.",
          "parameter": null,
          "status_code": 404,
        },
      },
    },
    "attemptNumber": 1,
    "verificationToken": null,
  },
});
