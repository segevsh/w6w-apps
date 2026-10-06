import action from "../../actions/delete-domain.ts";
import { testDeleteById } from "../_shapes.ts";

testDeleteById("delete-domain", action, "domainId", "/v1/domains/{id}", 204);
