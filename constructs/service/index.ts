import {
  GoogleCloudRunV2Service,
  type GoogleCloudRunV2ServiceTemplateContainersEnv,
} from "@cdktf/provider-google-beta/lib/google-cloud-run-v2-service";
import type { ArtifactRegistryRepository } from "@cdktf/provider-google/lib/artifact-registry-repository";
import { CloudRunServiceIamMember } from "@cdktf/provider-google/lib/cloud-run-service-iam-member";
import { ProjectIamMember } from "@cdktf/provider-google/lib/project-iam-member";
import { SecretManagerSecretIamMember } from "@cdktf/provider-google/lib/secret-manager-secret-iam-member";
import type { SecretManagerSecretVersion } from "@cdktf/provider-google/lib/secret-manager-secret-version";
import { ServiceAccount } from "@cdktf/provider-google/lib/service-account";
import { ServiceAccountIamMember } from "@cdktf/provider-google/lib/service-account-iam-member";
import type { ITerraformDependable } from "cdktf";
import { Construct } from "constructs";

export interface ServiceConfig {
  name: string;
  imageTag?: string;
  project: string;
  environment: string;
  artifactRegistry: ArtifactRegistryRepository;
  public?: boolean;

  otelCollector: string;

  env?: Record<string, string>;
  envSecrets?: Record<string, SecretManagerSecretVersion>;

  deployer: string;

  dependsOn?: ITerraformDependable[];
}

export class Service extends Construct {
  public readonly run: GoogleCloudRunV2Service;
  public readonly serviceAccount: ServiceAccount;

  constructor(scope: Construct, config: ServiceConfig) {
    super(scope, config.name);

    const registry = config.artifactRegistry;
    const imageName = `${registry.location}-docker.pkg.dev/${
      registry.project
    }/${registry.name}/${config.name}:${config.imageTag ?? "main"}`;

    // TODO: Only allow from internal after setting up Firebase.
    const ingress = "INGRESS_TRAFFIC_ALL";

    this.serviceAccount = new ServiceAccount(this, "service-account", {
      accountId: `service-${config.name}`,
    });

    new ProjectIamMember(this, "service-account-metrics", {
      project: config.project,
      role: "roles/monitoring.metricWriter",
      member: this.serviceAccount.member,
    });

    new ProjectIamMember(this, "service-account-traces", {
      project: config.project,
      role: "roles/cloudtrace.agent",
      member: this.serviceAccount.member,
    });

    new ProjectIamMember(this, "service-account-profiles", {
      project: config.project,
      role: "roles/cloudprofiler.agent",
      member: this.serviceAccount.member,
    });

    // Allow GitHub repo to deploy.
    new ServiceAccountIamMember(this, "cloudrun-github", {
      serviceAccountId: this.serviceAccount.name,
      role: "roles/iam.serviceAccountUser",
      member: config.deployer,
    });

    const dependsOn = config.dependsOn ?? [];

    const env: GoogleCloudRunV2ServiceTemplateContainersEnv[] = [];
    env.push({
      name: "CONFIG_ENV",
      value: config.environment,
    });
    env.push({
      name: "OTEL_METRICS_EXPORTER",
      value: "otlp",
    });
    env.push({
      name: "OTEL_TRACES_EXPORTER",
      value: "otlp",
    });
    env.push({
      name: "OTEL_SERVICE_NAME",
      value: config.name,
    });
    if (config.public) {
      env.push({
        name: "OTEL_TRACES_SAMPLER",
        value: "always_on",
      });
    }

    env.push({
      name: "LOGGING_JSON",
      value: "true",
    });

    for (const [name, value] of Object.entries(config.env ?? {})) {
      env.push({
        name,
        value,
      });
    }

    for (const [name, secret] of Object.entries(config.envSecrets ?? {})) {
      env.push({
        name,
        valueSource: {
          secretKeyRef: {
            secret: secret.secret,
            version: secret.version,
          },
        },
      });

      const secretIam = new SecretManagerSecretIamMember(
        this,
        `secret-accessor-${name}`,
        {
          secretId: secret.secret,
          role: "roles/secretmanager.secretAccessor",
          member: this.serviceAccount.member,
        },
      );
      dependsOn.push(secretIam);
    }

    this.run = new GoogleCloudRunV2Service(this, "service", {
      name: config.name,
      location: "us-central1",
      customAudiences: [config.name],
      ingress,
      template: {
        executionEnvironment: "EXECUTION_ENVIRONMENT_GEN2",
        serviceAccount: this.serviceAccount.email,
        scaling: {
          minInstanceCount: 0,
          maxInstanceCount: 1,
        },
        containers: [
          {
            image: imageName,
            name: "app",
            resources: {
              cpuIdle: true,
              startupCpuBoost: true,
            },
            startupProbe: {
              periodSeconds: 1,
              failureThreshold: 10,
              initialDelaySeconds: 1,
              httpGet: {
                path: "/internal/health",
                port: 8080,
              },
            },
            livenessProbe: {
              periodSeconds: 5,
              failureThreshold: 3,
              httpGet: {
                path: "/internal/health",
                port: 8080,
              },
            },
            env: [...env],
            ports: {
              name: "h2c",
              containerPort: 8080,
            },
          },
          {
            image: config.otelCollector,
            name: "otel",
            args: ["--config", "/otel/config.yaml"],
            resources: {
              cpuIdle: true,
              startupCpuBoost: true,
              limits: {
                cpu: "1000m",
                memory: "256Mi",
              },
            },
            // Startup time is relatively slow, we don't add a startup probe so
            // the main container can serve requests as soon as it's ready.
          },
        ],
      },
      dependsOn,
      lifecycle: {
        ignoreChanges: config.imageTag
          ? undefined
          : [
              // Allow external deployment.
              "client",
              "client_version",
              "template[0].revision",
              "template[0].containers[0].image",
            ],
      },
    });

    if (config.public) {
      new CloudRunServiceIamMember(this, "publicaccess", {
        location: this.run.location,
        service: this.run.name,
        role: "roles/run.invoker",
        member: "allUsers",
      });
    }
  }
}
