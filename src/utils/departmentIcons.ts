import React from 'react';
import {
  Shield,
  Rocket,
  Laptop,
  TrendingUp,
  FileCheck,
  AlertCircle,
  DollarSign,
  Calculator,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { DepartmentId } from '../types';

/** Icon for each of the 10 corporate departments. */
export const DEPT_ICONS: Record<DepartmentId, React.ElementType> = {
  compliance_legal: Shield,
  new_venture: Rocket,
  it: Laptop,
  sales: TrendingUp,
  underwriting: FileCheck,
  claims: AlertCircle,
  finance_invest: DollarSign,
  accounting_tax: Calculator,
  admin_procure: ShoppingBag,
  hr: Users,
};
