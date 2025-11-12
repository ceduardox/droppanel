import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar } from "lucide-react";
import {
  useExpenseCategories,
  useCreateExpenseCategory,
  useCreateExpense,
  useExpensesSummary,
} from "@/lib/api";

export default function Expenses() {
  const { toast } = useToast();
  const [newCategory, setNewCategory] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const { data: categories = [], isLoading: categoriesLoading } = useExpenseCategories();
  const createCategory = useCreateExpenseCategory();
  const createExpense = useCreateExpense();
  const { data: summary, isLoading: summaryLoading } = useExpensesSummary(startDate, endDate);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    try {
      await createCategory.mutateAsync({ name: newCategory.trim() });
      setNewCategory("");
      toast({
        title: "Categoría creada",
        description: "La categoría se ha creado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la categoría",
        variant: "destructive",
      });
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !amount || !expenseDate) return;

    try {
      await createExpense.mutateAsync({
        categoryId: selectedCategory,
        amount,
        expenseDate,
      });
      setSelectedCategory("");
      setAmount("");
      setExpenseDate(new Date().toISOString().split('T')[0]);
      toast({
        title: "Gasto registrado",
        description: "El gasto se ha registrado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el gasto",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Gestión de Gastos</h1>

      {/* Crear Categorías */}
      <Card>
        <CardHeader>
          <CardTitle>Crear Categoría de Gasto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateCategory} className="flex gap-2">
            <Input
              placeholder="Ej: Gasolina, Papel, etc."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              data-testid="input-category-name"
            />
            <Button type="submit" disabled={createCategory.isPending} data-testid="button-create-category">
              <Plus className="h-4 w-4 mr-2" />
              Crear
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Registrar Gasto */}
      <Card>
        <CardHeader>
          <CardTitle>Registrar Gasto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateExpense} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger data-testid="select-expense-category">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Monto (Bs)</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="input-expense-amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseDate">Fecha</Label>
              <Input
                id="expenseDate"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                data-testid="input-expense-date"
              />
            </div>

            <Button
              type="submit"
              disabled={createExpense.isPending || !selectedCategory || !amount}
              className="w-full"
              data-testid="button-create-expense"
            >
              Registrar Gasto
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Reporte de Gastos */}
      <Card>
        <CardHeader>
          <CardTitle>Reporte de Gastos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
          </div>

          {summaryLoading ? (
            <p className="text-center text-muted-foreground">Cargando reporte...</p>
          ) : summary && summary.expenses.length > 0 ? (
            <>
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="p-3 text-left font-medium">Categoría</th>
                      <th className="p-3 text-left font-medium">Fecha</th>
                      <th className="p-3 text-right font-medium">Monto (Bs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.expenses.map((expense: any) => (
                      <tr key={expense.id} className="border-b" data-testid={`row-expense-${expense.id}`}>
                        <td className="p-3">{expense.category?.name}</td>
                        <td className="p-3">{expense.expenseDate}</td>
                        <td className="p-3 text-right font-mono">{parseFloat(expense.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Card className="bg-primary text-primary-foreground">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">Total del Periodo:</span>
                    <span className="text-3xl font-bold" data-testid="text-total-expenses">
                      {parseFloat(summary.total).toFixed(2)} Bs
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay gastos registrados en este periodo
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
