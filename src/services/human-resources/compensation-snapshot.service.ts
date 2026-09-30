/** Build scaled component snapshots from a salary structure template + target gross. */

export type StructureLine = {
  componentId?: string;
  componentName?: string;
  type?: string;
  calcType?: string;
  amountOrPercentage?: number;
  computedAmount?: number;
};

export type ComponentSnapshot = {
  gross: number;
  totalDeductions: number;
  net: number;
  earnings: StructureLine[];
  deductions: StructureLine[];
  earningsBreakdown: Record<string, number>;
  deductionsBreakdown: Record<string, number>;
};

function isBasicLine(line: StructureLine): boolean {
  const name = String(line.componentName ?? "").toLowerCase();
  return name.includes("basic");
}

function clampAmount(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function computeLineAmount(line: StructureLine, basicVal: number): number {
  const amt = clampAmount(Number(line.amountOrPercentage ?? 0));
  if (isBasicLine(line)) return basicVal;
  const calcType = String(line.calcType ?? "");
  if (calcType === "Percentage of Basic") {
    return clampAmount((basicVal * amt) / 100);
  }
  return amt;
}

function templateGrossFromStructure(struct: {
  grossSalary?: number;
  gross_salary?: number;
  earnings?: StructureLine[];
}): number {
  const stored = Number(struct.grossSalary ?? struct.gross_salary ?? 0);
  if (stored > 0) return stored;
  const earnings = struct.earnings ?? [];
  return earnings.reduce((s, line) => s + Number(line.computedAmount ?? 0), 0);
}

function findEarningAmount(lines: StructureLine[], pattern: RegExp): number {
  return (
    lines.find((line) => pattern.test(String(line.componentName ?? "").toLowerCase()))
      ?.computedAmount ?? 0
  );
}

function findDeductionAmount(lines: StructureLine[], pattern: RegExp): number {
  return (
    lines.find((line) => pattern.test(String(line.componentName ?? "").toLowerCase()))
      ?.computedAmount ?? 0
  );
}

function buildBreakdowns(earnings: StructureLine[], deductions: StructureLine[]) {
  const basicSalary = findEarningAmount(earnings, /basic/);
  const hra = findEarningAmount(earnings, /hra|house/);
  const gross = earnings.reduce((s, l) => s + Number(l.computedAmount ?? 0), 0);
  const allowances = Math.max(0, gross - basicSalary - hra);
  const overtimePay = findEarningAmount(earnings, /overtime|ot/);
  const holidayPay = findEarningAmount(earnings, /holiday/);
  const incentives = findEarningAmount(earnings, /incentive/);
  const bonus = findEarningAmount(earnings, /bonus/);
  const otherEarnings = Math.max(
    0,
    gross - basicSalary - hra - allowances - overtimePay - holidayPay - incentives - bonus,
  );

  const pfDeduction = findDeductionAmount(deductions, /pf|provident/);
  const esiDeduction = findDeductionAmount(deductions, /esi/);
  const ptDeduction = findDeductionAmount(deductions, /pt|professional/);
  const tdsDeduction = findDeductionAmount(deductions, /tds/);
  const leaveDeduction = findDeductionAmount(deductions, /leave/);
  const totalDeductions = deductions.reduce((s, l) => s + Number(l.computedAmount ?? 0), 0);
  const otherDeductions = Math.max(
    0,
    totalDeductions - pfDeduction - esiDeduction - ptDeduction - tdsDeduction - leaveDeduction,
  );

  return {
    gross,
    totalDeductions,
    net: gross - totalDeductions,
    earningsBreakdown: {
      basicSalary,
      hra,
      allowances,
      overtimePay,
      holidayPay,
      incentives,
      bonus,
      otherEarnings,
    },
    deductionsBreakdown: {
      leaveDeduction,
      pfDeduction,
      esiDeduction,
      ptDeduction,
      tdsDeduction,
      otherDeductions,
    },
  };
}

/**
 * Scales template component lines to match targetGross (proportional on fixed lines, % of basic preserved).
 */
export function buildComponentSnapshotFromStructure(
  struct: {
    grossSalary?: number;
    gross_salary?: number;
    earnings?: StructureLine[];
    deductions?: StructureLine[];
  },
  targetGross: number,
): ComponentSnapshot {
  const target = clampAmount(targetGross);
  const earningsIn = [...(struct.earnings ?? [])];
  const deductionsIn = [...(struct.deductions ?? [])];

  if (earningsIn.length === 0) {
    const breakdown = {
      basicSalary: target,
      hra: 0,
      allowances: 0,
      overtimePay: 0,
      holidayPay: 0,
      incentives: 0,
      bonus: 0,
      otherEarnings: 0,
    };
    return {
      gross: target,
      totalDeductions: 0,
      net: target,
      earnings: [
        {
          componentName: "Basic Salary",
          calcType: "Fixed Amount",
          amountOrPercentage: target,
          computedAmount: target,
        },
      ],
      deductions: [],
      earningsBreakdown: breakdown,
      deductionsBreakdown: {
        leaveDeduction: 0,
        pfDeduction: 0,
        esiDeduction: 0,
        ptDeduction: 0,
        tdsDeduction: 0,
        otherDeductions: 0,
      },
    };
  }

  const templateGross = templateGrossFromStructure(struct);
  const scale = templateGross > 0 ? target / templateGross : 1;

  const basicTemplate =
    earningsIn.find(isBasicLine) ??
    earningsIn.find((e) => String(e.type).toLowerCase().includes("earning")) ??
    earningsIn[0];
  const templateBasic = clampAmount(
    Number(basicTemplate?.computedAmount ?? basicTemplate?.amountOrPercentage ?? 0),
  );
  let basicVal = clampAmount(templateBasic * scale);
  if (basicVal <= 0 && target > 0) basicVal = target;

  let computedEarnings = earningsIn.map((line) => {
    const scaledBasic = isBasicLine(line) ? basicVal : undefined;
    const lineBasic = scaledBasic ?? basicVal;
    let computed = computeLineAmount(line, lineBasic);
    if (!isBasicLine(line) && line.calcType !== "Percentage of Basic") {
      const templateAmt = clampAmount(Number(line.computedAmount ?? line.amountOrPercentage ?? 0));
      computed = clampAmount(templateAmt * scale);
    }
    if (isBasicLine(line)) computed = basicVal;
    return {
      ...line,
      computedAmount: computed,
    };
  });

  let gross = computedEarnings.reduce((s, l) => s + Number(l.computedAmount ?? 0), 0);
  if (gross !== target && computedEarnings.length > 0) {
    const drift = target - gross;
    const adjustable = [...computedEarnings]
      .map((line, idx) => ({ line, idx }))
      .filter(({ line }) => !isBasicLine(line))
      .pop();
    const adjustIdx = adjustable?.idx ?? computedEarnings.length - 1;
    const line = computedEarnings[adjustIdx];
    computedEarnings = computedEarnings.map((l, i) =>
      i === adjustIdx
        ? {
            ...l,
            computedAmount: clampAmount(Number(l.computedAmount ?? 0) + drift),
          }
        : l,
    );
    gross = computedEarnings.reduce((s, l) => s + Number(l.computedAmount ?? 0), 0);
    if (adjustIdx >= 0 && line) {
      void line;
    }
  }

  const computedDeductions = deductionsIn.map((line) => {
    const computed = computeLineAmount(line, basicVal);
    if (line.calcType !== "Percentage of Basic") {
      const templateAmt = clampAmount(Number(line.computedAmount ?? line.amountOrPercentage ?? 0));
      return { ...line, computedAmount: clampAmount(templateAmt * scale) };
    }
    return { ...line, computedAmount: computed };
  });

  const totals = buildBreakdowns(computedEarnings, computedDeductions);

  return {
    gross: totals.gross,
    totalDeductions: totals.totalDeductions,
    net: totals.net,
    earnings: computedEarnings,
    deductions: computedDeductions,
    earningsBreakdown: totals.earningsBreakdown,
    deductionsBreakdown: totals.deductionsBreakdown,
  };
}

export function payrollPayloadFromSnapshot(
  snapshot: ComponentSnapshot,
  validation: Record<string, boolean>,
  bonusExtra = 0,
) {
  const earningsBreakdown = { ...snapshot.earningsBreakdown };
  if (bonusExtra > 0) {
    earningsBreakdown.bonus = Number(earningsBreakdown.bonus ?? 0) + bonusExtra;
  }
  const grossSalary =
    Number(snapshot.gross) + (bonusExtra > 0 ? bonusExtra : 0);
  const netSalary = grossSalary - Number(snapshot.totalDeductions);

  return {
    grossSalary,
    earningsTotal: grossSalary,
    deductionsTotal: snapshot.totalDeductions,
    netSalary,
    status: "Calculated" as const,
    earningsBreakdown,
    deductionsBreakdown: snapshot.deductionsBreakdown,
    validationFlags: validation,
  };
}
