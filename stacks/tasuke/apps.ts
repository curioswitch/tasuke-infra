import { ArtifactRegistryRepository } from "@cdktf/provider-google/lib/artifact-registry-repository";
import { ArtifactRegistryRepositoryIamMember } from "@cdktf/provider-google/lib/artifact-registry-repository-iam-member";
import { ProjectIamCustomRole } from "@cdktf/provider-google/lib/project-iam-custom-role";
import { ProjectIamMember } from "@cdktf/provider-google/lib/project-iam-member";
import { ProjectService } from "@cdktf/provider-google/lib/project-service";
import { Construct } from "constructs";
import { Service } from "../../constructs/service";

export interface AppsConfig {
  project: string;
  domain: string;
  environment: string;
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

    const runService = new ProjectService(this, "run", {
      service: "run.googleapis.com",
    });

    const dockerRegistry = new ArtifactRegistryRepository(this, "docker-repo", {
      repositoryId: "docker",
      location: "us-central1",
      format: "DOCKER",
      dependsOn: [artifactRegistryService],
    });

    const tasukeRepoMember = `principalSet://iam.googleapis.com/${config.githubIdPool}/attribute.repository/curioswitch/tasuke`;

    const deployerRole = new ProjectIamCustomRole(this, "cloudrun-deployer", {
      roleId: "cloudRunDeployer",
      title: "Cloud Run Deployer",
      permissions: [
        "run.operations.get",
        "run.services.create",
        "run.services.get",
        "run.services.update",
      ],
    });

    new ProjectIamMember(this, "github-cloudrun-deploy", {
      project: config.project,
      role: deployerRole.name,
      member: tasukeRepoMember,
    });

    new ArtifactRegistryRepositoryIamMember(this, "docker-member-github", {
      repository: dockerRegistry.name,
      location: dockerRegistry.location,
      role: "roles/artifactregistry.writer",
      member: tasukeRepoMember,
    });

    new Service(this, {
      name: "frontend-server",
      project: config.project,
      environment: config.environment,
      artifactRegistry: dockerRegistry,
      deployer: tasukeRepoMember,
      public: true,

      dependsOn: [runService],
    });
  }
}
