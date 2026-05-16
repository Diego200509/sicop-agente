import { Badge } from "@/src/components/ui/badge";
import type { BudgetStatus } from "@/src/features/budget/types/budget.types";
import {
  getBudgetBadgeVariant,
  getBudgetStatusLabel,
} from "@/src/features/budget/utils/budget-formatters";

export function BudgetStatusBadge({ estado }: { estado: BudgetStatus | null | undefined }) {
  return (
    <Badge variant={getBudgetBadgeVariant(estado)} className="w-fit capitalize">
      {getBudgetStatusLabel(estado)}
    </Badge>
  );
}

