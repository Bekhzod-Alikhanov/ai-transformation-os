import Decimal from "decimal.js";
import { taskRowSchema, type TaskRow, type SolutionOption } from "./types";

/** Shared baseline only; intervention handling, eligibility, review and adoption stay independent. */
export function shareTaskBaseline(
  options: SolutionOption[],
  edited: SolutionOption,
  old: SolutionOption,
) {
  const baseline = (x: SolutionOption) =>
    x.taskPlan?.rows.map((r) => [r.name, r.annualVolume, r.currentMinutes]);
  const rows = edited.taskPlan?.rows;
  const tasksChanged =
    !!rows &&
    JSON.stringify(baseline(edited)) !== JSON.stringify(baseline(old));
  if (tasksChanged) {
    const before = rows.every(
      (r) => r.annualVolume !== null && r.currentMinutes !== null,
    )
      ? rows.reduce(
          (sum, r) =>
            sum.plus(new Decimal(r.annualVolume!).times(r.currentMinutes!)),
          new Decimal(0),
        )
      : null;
    const minutes =
      before && edited.inputs.annualVolume
        ? before.div(edited.inputs.annualVolume).toNumber()
        : null;
    options.forEach((option) => {
      option.inputs.minutesBefore = minutes;
      if (!option.taskPlan) return;
      option.taskPlan.rows = rows.map((source) => {
        const baselineKey = source.baselineKey ?? source.id;
        const oldIndex =
          old.taskPlan?.rows.findIndex(
            (r) =>
              r.id === source.id ||
              (!!source.baselineKey && r.baselineKey === source.baselineKey),
          ) ?? -1;
        const prior =
          option.id === edited.id
            ? source
            : (option.taskPlan!.rows.find(
                (r) => r.baselineKey === baselineKey,
              ) ??
              (oldIndex >= 0 ? option.taskPlan!.rows[oldIndex] : undefined));
        return {
          ...(prior ?? {
            ...source,
            id: crypto.randomUUID(),
            responsibility: "human" as const,
            eligible: 0,
            remainingMinutes: source.currentMinutes,
            reviewMinutes: 0,
            exceptionRate: 0,
            exceptionMinutes: 0,
          }),
          baselineKey,
          name: source.name,
          annualVolume: source.annualVolume,
          currentMinutes: source.currentMinutes,
        };
      });
    });
  } else if (
    old.inputs.annualVolume !== edited.inputs.annualVolume ||
    old.inputs.minutesBefore !== edited.inputs.minutesBefore
  ) {
    const volumeScale = old.inputs.annualVolume
      ? (edited.inputs.annualVolume ?? 0) / old.inputs.annualVolume
      : null;
    const timeScale = old.inputs.minutesBefore
      ? (edited.inputs.minutesBefore ?? 0) / old.inputs.minutesBefore
      : null;
    options.forEach((option) => {
      if (!option.taskPlan) return;
      option.taskPlan.rows = option.taskPlan.rows.map((r) => ({
        ...r,
        annualVolume:
          volumeScale === null ||
          edited.inputs.annualVolume === null ||
          r.annualVolume === null
            ? null
            : r.annualVolume * volumeScale,
        currentMinutes:
          timeScale === null ||
          edited.inputs.minutesBefore === null ||
          r.currentMinutes === null
            ? null
            : r.currentMinutes * timeScale,
      }));
    });
  }
}

/** Human minutes only. Machine latency is not labour. Never clamp negative savings. */
export function taskEffort(
  rows: TaskRow[],
  adoption: number | null,
  handlingScale = 1,
) {
  const issues: string[] = [];
  if (
    adoption === null ||
    !Number.isFinite(adoption) ||
    adoption < 0 ||
    adoption > 1
  )
    issues.push("Task adoption is unknown or outside 0–100%");
  if (!rows.length) issues.push("Add at least one baseline task");
  for (const row of rows) {
    if (!taskRowSchema.safeParse(row).success)
      issues.push(`${row.name}: invalid task inputs`);
    for (const key of [
      "annualVolume",
      "currentMinutes",
      "eligible",
      "remainingMinutes",
      "reviewMinutes",
      "exceptionRate",
      "exceptionMinutes",
    ] as const)
      if (row[key] === null) issues.push(`${row.name}: ${key} is unknown`);
  }
  if (issues.length)
    return {
      baselineHours: null,
      futureHours: null,
      releasedHours: null,
      issues,
    };
  let before = new Decimal(0),
    after = new Decimal(0);
  for (const row of rows) {
    const volume = new Decimal(row.annualVolume!);
    const used = new Decimal(row.eligible!).times(adoption!);
    const assisted = new Decimal(row.currentMinutes!).minus(
      new Decimal(row.currentMinutes!)
        .minus(row.remainingMinutes!)
        .times(handlingScale),
    );
    // A perturbation cannot manufacture negative human handling.
    const future = new Decimal(row.currentMinutes!)
      .times(new Decimal(1).minus(used))
      .plus(
        used.times(
          Decimal.max(0, assisted)
            .plus(row.reviewMinutes!)
            .plus(new Decimal(row.exceptionRate!).times(row.exceptionMinutes!)),
        ),
      );
    before = before.plus(volume.times(row.currentMinutes!).div(60));
    after = after.plus(volume.times(future).div(60));
  }
  const values = [before, after, before.minus(after)].map((x) =>
    x.toDecimalPlaces(6).toNumber(),
  );
  if (values.some((x) => !Number.isFinite(x)))
    return {
      baselineHours: null,
      futureHours: null,
      releasedHours: null,
      issues: ["Task effort exceeds the representable range"],
    };
  return {
    baselineHours: values[0],
    futureHours: values[1],
    releasedHours: values[2],
    issues,
  };
}
