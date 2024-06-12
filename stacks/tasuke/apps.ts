import { ArtifactRegistryRepository } from "@cdktf/provider-google/lib/artifact-registry-repository";
import { ArtifactRegistryRepositoryIamMember } from "@cdktf/provider-google/lib/artifact-registry-repository-iam-member";
import { ProjectIamCustomRole } from "@cdktf/provider-google/lib/project-iam-custom-role";
import { ProjectIamMember } from "@cdktf/provider-google/lib/project-iam-member";
import { ProjectService } from "@cdktf/provider-google/lib/project-service";
import { Construct } from "constructs";
import { Service } from "../../constructs/service";
import type { Secrets } from "./secrets";

export interface AppsConfig {
  project: string;
  domain: string;
  environment: string;
  githubRepoIamMember: string;
  secrets: Secrets;
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

    new ProjectService(this, "service-cloudtrace", {
      service: "cloudtrace.googleapis.com",
    });

    new ProjectService(this, "service-monitoring", {
      service: "monitoring.googleapis.com",
    });

    const dockerRegistry = new ArtifactRegistryRepository(this, "docker-repo", {
      repositoryId: "docker",
      location: "us-central1",
      format: "DOCKER",
      dependsOn: [artifactRegistryService],
    });

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
      member: config.githubRepoIamMember,
    });

    new ArtifactRegistryRepositoryIamMember(this, "docker-member-github", {
      repository: dockerRegistry.name,
      location: dockerRegistry.location,
      role: "roles/artifactregistry.writer",
      member: config.githubRepoIamMember,
    });

    const ghcrRepo = new ArtifactRegistryRepository(this, "ghcr-repo", {
      repositoryId: "ghcr",
      location: "us-central1",
      format: "DOCKER",
      mode: "REMOTE_REPOSITORY",
      remoteRepositoryConfig: {
        dockerRepository: {
          customRepository: {
            uri: "https://ghcr.io",
          },
        },
      },

      dependsOn: [artifactRegistryService],
    });

    const otelCollector = `${ghcrRepo.location}-docker.pkg.dev/${ghcrRepo.project}/${ghcrRepo.name}/curioswitch/go-usegcp/otel-collector:latest`;

    const frontendServer = new Service(this, {
      name: "frontend-server",
      project: config.project,
      environment: config.environment,
      artifactRegistry: dockerRegistry,
      deployer: config.githubRepoIamMember,
      public: true,
      otelCollector,

      dependsOn: [runService],
    });

    new ProjectIamMember(this, "frontend-server-firestore", {
      project: config.project,
      role: "roles/datastore.user",
      member: frontendServer.serviceAccount.member,
    });

    const webhookServer = new Service(this, {
      name: "webhook-server",
      project: config.project,
      environment: config.environment,
      artifactRegistry: dockerRegistry,
      deployer: config.githubRepoIamMember,
      public: true,
      otelCollector,

      envSecrets: {
        GITHUB_SECRET: config.secrets.githubWebhookSecretSecretV1,
        GITHUB_PRIVATEKEYBASE64:
          config.secrets.githubAppPrivateKeyBase64SecretV1,
      },

      dependsOn: [runService],
    });

    new ProjectIamMember(this, "webhook-server-firestore", {
      project: config.project,
      role: "roles/datastore.user",
      member: webhookServer.serviceAccount.member,
    });
  }
}
