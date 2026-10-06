import action from "../../actions/delete-webhook.ts";
import { testDeleteById } from "../_shapes.ts";

testDeleteById("delete-webhook", action, "webhookId", "/v1/webhooks/{id}", 204);
