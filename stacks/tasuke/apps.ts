import { ArtifactRegistryRepository } from "@cdktf/provider-google/lib/artifact-registry-repository";
import { ArtifactRegistryRepositoryIamMember } from "@cdktf/provider-google/lib/artifact-registry-repository-iam-member";
import { ProjectService } from "@cdktf/provider-google/lib/project-service";
import { Construct } from "constructs";

export interface AppsConfig {
  domain: string;
  githubIdPool: string;
}

export class Apps extends Construct {
  constructor(scope: Construct, config: AppsConfig) {
    super(scope, "apps");

    const artifactRegistryService = new ProjectService(
      this,
      "artifactregistry",
      {
        service: "artifactregistry.googleapis.com",
      },
    );

    const dockerRegistry = new ArtifactRegistryRepository(this, "docker-repo", {
      repositoryId: "docker",
      location: "us-central1",
      format: "DOCKER",
      dependsOn: [artifactRegistryService],
    });

    new ArtifactRegistryRepositoryIamMember(this, "docker-member-github", {
      repository: dockerRegistry.name,
      location: dockerRegistry.location,
      role: "roles/artifactregistry.writer",
      member: `principalSet://iam.googleapis.com/${config.githubIdPool}/attribute.repository/curioswitch/tasuke"`,
    });
  }
}
