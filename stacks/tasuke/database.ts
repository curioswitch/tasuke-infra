import { FirestoreDatabase } from "@cdktf/provider-google/lib/firestore-database";
import { ProjectService } from "@cdktf/provider-google/lib/project-service";
import { Construct } from "constructs";

export class Database extends Construct {
  constructor(scope: Construct) {
    super(scope, "database");

    const firestoreService = new ProjectService(this, "firestore", {
      service: "firestore.googleapis.com",
    });

    // We use (default) database to take advantage of free tier.
    new FirestoreDatabase(this, "firestore-db", {
      name: "(default)",
      locationId: "us-central1",
      type: "FIRESTORE_NATIVE",
      dependsOn: [firestoreService],
    });
  }
}
