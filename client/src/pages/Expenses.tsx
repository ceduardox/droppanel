import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Check, X, Image, Eye } from "lucide-react";
import {
  useExpenseCategories,
  useCreateExpenseCategory,
  useCreateExpense,
  useExpensesSummary,
  useUpdateExpense,
} from "@/lib/api";

export default function Expenses() {
  const { toast } = useToast();
  const [newCategory, setNewCategory] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseImage, setExpenseImage] = useState<File | null>(null);
  
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const { data: categories = [], isLoading: categoriesLoading } = useExpenseCategories() as { data: any[], isLoading: boolean };
  const createCategory = useCreateExpenseCategory();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
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
      const formData = new FormData();
      formData.append("categoryId", selectedCategory);
      formData.append("amount", amount);
      formData.append("expenseDate", expenseDate);
      if (expenseImage) {
        formData.append("image", expenseImage);
      }

      await createExpense.mutateAsync(formData);
      setSelectedCategory("");
      setAmount("");
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setExpenseImage(null);
      const fileInput = document.getElementById("expenseImage") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
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

  const startEdit = (expense: any) => {
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Gestión de Gastos</h1>

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

            <div className="space-y-2">
              <Label htmlFor="expenseImage">Comprobante (opcional)</Label>
              <Input
                id="expenseImage"
                type="file"
                accept="image/*"
                onChange={(e) => setExpenseImage(e.target.files?.[0] || null)}
                data-testid="input-expense-image"
              />
              {expenseImage && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Image className="h-3 w-3" />
                  {expenseImage.name}
                </p>
              )}
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
                      <th className="p-3 text-center font-medium">Comprobante</th>
                      <th className="p-3 text-center font-medium w-20">Editar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.expenses.map((expense: any) => (
                      <tr key={expense.id} className="border-b" data-testid={`row-expense-${expense.id}`}>
                        {editingId === expense.id ? (
                          <>
                            <td className="p-2">
                              <Select value={editCategory} onValueChange={setEditCategory}>
                                <SelectTrigger className="h-8" data-testid="select-edit-category">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((cat: any) => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Input
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="h-8"
                                data-testid="input-edit-date"
                              />
                            </td>
                            <td className="p-3 text-right font-mono">{parseFloat(expense.amount).toFixed(2)}</td>
                            <td className="p-3 text-center">
                              {expense.imageUrl && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => window.open(`/api/storage/${expense.imageUrl}`, '_blank')}
                                  data-testid={`button-view-receipt-${expense.id}`}
                                >
                                  <Eye className="h-4 w-4 text-blue-500" />
                                </Button>
                              )}
                            </td>
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
                            <td className="p-3">{expense.category?.name}</td>
                            <td className="p-3">{expense.expenseDate}</td>
                            <td className="p-3 text-right font-mono">{parseFloat(expense.amount).toFixed(2)}</td>
                            <td className="p-3 text-center">
                              {expense.imageUrl ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => window.open(`/api/storage/${expense.imageUrl}`, '_blank')}
                                  data-testid={`button-view-receipt-${expense.id}`}
                                >
                                  <Eye className="h-4 w-4 text-blue-500" />
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(expense)} data-testid={`button-edit-${expense.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </td>
                          </>
                        )}
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
