import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExpenses, useExpenseCategories, useUpdateExpense } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Check, X, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Expense {
  id: string;
  categoryId: string;
  category: string;
  description: string;
  amount: string;
  expenseDate: string;
}

interface Category {
  id: string;
  name: string;
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromISODate(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

type DateFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  testId: string;
};

function DateField({ id, label, value, onChange, testId }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = fromISODate(value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "h-9 w-full justify-between rounded-md border-input bg-background px-3 text-left text-sm font-medium",
              !selectedDate && "text-muted-foreground"
            )}
            data-testid={testId}
          >
            <span>{selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Seleccionar fecha"}</span>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              onChange(toISODate(date));
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function formatDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

export default function ExpensesReport() {
  const { data: expenses = [], isLoading } = useExpenses();
  const { data: categories = [] } = useExpenseCategories();
  const updateExpense = useUpdateExpense();
  const { toast } = useToast();
  
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const filteredExpenses = (expenses as Expense[]).filter((item) => {
    if (!startDate || !endDate) return true;
    return item.expenseDate >= startDate && item.expenseDate <= endDate;
  });

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditDate(expense.expenseDate);
    setEditCategory(expense.categoryId);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDate("");
    setEditCategory("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await updateExpense.mutateAsync({
        id: editingId,
        data: { categoryId: editCategory, expenseDate: editDate },
      });
      toast({ title: "Éxito", description: "Gasto actualizado" });
      cancelEdit();
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reporte de Gastos</h1>
        <p className="text-muted-foreground mt-1">Consulta y edita gastos por rango de fechas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Rango de Fechas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <DateField
              id="startDate"
              label="Fecha Inicial"
              value={startDate}
              onChange={setStartDate}
              testId="input-expense-start-date"
            />
            <DateField
              id="endDate"
              label="Fecha Final"
              value={endDate}
              onChange={setEndDate}
              testId="input-expense-end-date"
            />
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
                      <th className="p-3 text-center font-medium w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((expense, index) => (
                      <tr key={expense.id} className="border-b" data-testid={`row-expense-${index}`}>
                        {editingId === expense.id ? (
                          <>
                            <td className="p-2">
                              <Input
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="h-8"
                                data-testid="input-edit-date"
                              />
                            </td>
                            <td className="p-2">
                              <Select value={editCategory} onValueChange={setEditCategory}>
                                <SelectTrigger className="h-8" data-testid="select-edit-category">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(categories as Category[]).map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3 text-muted-foreground">{expense.description || "-"}</td>
                            <td className="p-3 text-right font-mono">{parseFloat(expense.amount).toFixed(2)} Bs</td>
                            <td className="p-2 text-center">
                              <div className="flex justify-center gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit} disabled={updateExpense.isPending} data-testid="button-save-edit">
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit} data-testid="button-cancel-edit">
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 text-sm">{formatDateString(expense.expenseDate)}</td>
                            <td className="p-3 font-medium">{expense.category}</td>
                            <td className="p-3 text-muted-foreground">{expense.description || "-"}</td>
                            <td className="p-3 text-right font-mono">{parseFloat(expense.amount).toFixed(2)} Bs</td>
                            <td className="p-3 text-center">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(expense)} data-testid={`button-edit-${index}`}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50">
                    <tr>
                      <td colSpan={3} className="p-3 font-bold">TOTAL</td>
                      <td className="p-3 text-right font-mono font-bold" data-testid="text-total-expenses">{totalAmount.toFixed(2)} Bs</td>
                      <td></td>
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
