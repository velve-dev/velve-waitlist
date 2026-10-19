// Allowed answers for the two optional questions.
import { questions } from "@/content/copy";

type FirstDeploy = keyof typeof questions.firstDeploy.options;
type RunsOn = keyof typeof questions.runsOn.options;
export type Answers = { firstDeploy: FirstDeploy; runsOn: RunsOn };

const firstDeployChoices = Object.keys(questions.firstDeploy.options) as FirstDeploy[];
const runsOnChoices = Object.keys(questions.runsOn.options) as RunsOn[];

function isOneOf<T extends string>(choices: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (choices as readonly string[]).includes(value);
}

export function readAnswers(value: unknown): Answers | null {
  if (typeof value !== "object" || value === null) return null;
  const { firstDeploy, runsOn } = value as Record<string, unknown>;
  if (!isOneOf(firstDeployChoices, firstDeploy) || !isOneOf(runsOnChoices, runsOn)) return null;
  return { firstDeploy, runsOn };
}
