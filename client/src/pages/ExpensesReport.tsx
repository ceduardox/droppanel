import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useExpenses } from "@/lib/api";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: string;
  expenseDate: string;
}

function formatDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

export default function ExpensesReport() {
  const { data: expenses = [], isLoading } = useExpenses();
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const filteredExpenses = (expenses as Expense[]).filter((item) => {
    if (!startDate || !endDate) return true;
    return item.expenseDate >= startDate && item.expenseDate <= endDate;
  });

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reporte de Gastos</h1>
        <p className="text-muted-foreground mt-1">Consulta gastos por rango de fechas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Rango de Fechas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-expense-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-expense-end-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="p-3 text-left font-medium">Fecha</th>
                      <th className="p-3 text-left font-medium">Categoría</th>
                      <th className="p-3 text-left font-medium">Descripción</th>
                      <th className="p-3 text-right font-medium">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((expense, index) => (
                      <tr key={expense.id} className="border-b" data-testid={`row-expense-${index}`}>
                        <td className="p-3 text-sm">{formatDateString(expense.expenseDate)}</td>
                        <td className="p-3 font-medium">{expense.category}</td>
                        <td className="p-3 text-muted-foreground">{expense.description || "-"}</td>
                        <td className="p-3 text-right font-mono">{parseFloat(expense.amount).toFixed(2)} Bs</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50">
                    <tr>
                      <td colSpan={3} className="p-3 font-bold">TOTAL</td>
                      <td className="p-3 text-right font-mono font-bold" data-testid="text-total-expenses">{totalAmount.toFixed(2)} Bs</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No hay gastos en este rango de fechas</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
