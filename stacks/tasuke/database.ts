import { ProjectService } from "@cdktf/provider-google/lib/project-service";
import { Construct } from "constructs";

export class Database extends Construct {
  constructor(scope: Construct) {
    super(scope, "database");

    new ProjectService(this, "firestore", {
      service: "firestore.googleapis.com",
    });

    // We use default database to take advantage of free tier so don't
    // configure anything else.
  }
}
