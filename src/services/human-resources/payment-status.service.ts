import { hrModel, hrTables } from "../../models/human-resources/index.js";

type PaymentRow = { amount: number; status: string };

export async function sumCompletedPayments(payrollId: string) {
  const payments = await hrModel.list<PaymentRow>(hrTables.salaryPayments, {
    filters: { payroll_id: payrollId },
  });
  return payments
    .filter((p) => p.status === "Completed")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
}

export function derivePayrollPaymentStatus(netSalary: number, totalPaid: number, currentStatus: string) {
  const payableStatuses = new Set(["Approved", "Partially Paid", "Paid"]);
  if (!payableStatuses.has(currentStatus) && totalPaid <= 0) {
    return currentStatus;
  }
  if (totalPaid <= 0) return "Approved";
  if (totalPaid >= Number(netSalary)) return "Paid";
  return "Partially Paid";
}

export async function syncPayrollPaymentStatus(payrollId: string) {
  const payroll = await hrModel.get<{ netSalary: number; status: string }>(
    hrTables.payrollRecords,
    payrollId,
  );
  if (!payroll) return null;

  const totalPaid = await sumCompletedPayments(payrollId);
  const nextStatus = derivePayrollPaymentStatus(
    Number(payroll.netSalary),
    totalPaid,
    payroll.status,
  );
  const now = new Date().toISOString();

  if (nextStatus !== payroll.status) {
    return hrModel.update(hrTables.payrollRecords, payrollId, {
      status: nextStatus,
      updatedAt: now,
    });
  }
  return payroll;
}
