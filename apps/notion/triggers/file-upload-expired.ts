import { webhookTrigger } from "../lib/triggers.ts";

/** Notion webhook event `file_upload.expired`. */
export default webhookTrigger({
  key: "file-upload-expired",
  title: "File Upload Expired",
  description:
    "Fires when a file upload expires before it was attached. The run gets the event and the file upload id.",
  eventTypes: ["file_upload.expired"],
  sample: {
    "id": "367cba44-b6f3-4c92-81e7-6a2e9659efd4",
    "type": "file_upload.expired",
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
    "data": {},
    "attemptNumber": 1,
    "verificationToken": null,
  },
});
