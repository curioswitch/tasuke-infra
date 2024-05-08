import { App } from "cdktf";
import { TasukeStack } from "./stacks/tasuke";

const app = new App();

new TasukeStack(app, {
  environment: "dev",
  project: "tasuke-dev",
  domain: "alpha.tasuke.dev",
});

app.synth();
