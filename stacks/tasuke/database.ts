import { FirestoreDatabase } from "@cdktf/provider-google/lib/firestore-database";
import { FirestoreIndex } from "@cdktf/provider-google/lib/firestore-index";
import { ProjectService } from "@cdktf/provider-google/lib/project-service";
import { Construct } from "constructs";

export class Database extends Construct {
  constructor(scope: Construct) {
    super(scope, "database");

    const firestoreService = new ProjectService(this, "firestore", {
      service: "firestore.googleapis.com",
    });

    // We use (default) database to take advantage of free tier.
    const db = new FirestoreDatabase(this, "firestore-db", {
      name: "(default)",
      locationId: "us-central1",
      type: "FIRESTORE_NATIVE",
      dependsOn: [firestoreService],
    });

    new FirestoreIndex(this, "reviews-index", {
      database: db.name,
      collection: "reviews",
      queryScope: "COLLECTION_GROUP",
      fields: [
        {
          fieldPath: "repo",
          order: "ASCENDING",
        },
        {
          fieldPath: "pullRequest",
          order: "ASCENDING",
        },
        {
          fieldPath: "completed",
          order: "ASCENDING",
        },
      ],
    });

    new FirestoreIndex(this, "users-index", {
      database: db.name,
      collection: "users",
      fields: [
        {
          fieldPath: "programmingLanguageIds",
          arrayConfig: "CONTAINS",
        },
        {
          fieldPath: "remainingReviews",
          order: "DESCENDING",
        },
      ],
    });
  }
}
