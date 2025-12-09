import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";

// Products
export function useProducts() {
  return useQuery({
    queryKey: ["/api/products"],
  });
}

export function useCreateProduct() {
  return useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("/api/products", {
        method: "POST",
        body: data,
        headers: {}, // Let browser set content-type for FormData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });
}

export function useUpdateProduct() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      return apiRequest(`/api/products/${id}`, {
        method: "PUT",
        body: data,
        headers: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });
}

export function useDeleteProduct() {
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/products/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });
}

// Sales
export function useSales() {
  return useQuery({
    queryKey: ["/api/sales"],
  });
}

export function useCreateSale() {
  return useMutation({
    mutationFn: async (data: { productId: string; quantity: number; date: string }) => {
      return apiRequest("/api/sales", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
  });
}

export function useUpdateSaleDate() {
  return useMutation({
    mutationFn: async ({ id, saleDate }: { id: string; saleDate: string }) => {
      return apiRequest(`/api/sales/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ saleDate }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
  });
}

// Reports
export function useReports() {
  return useQuery({
    queryKey: ["/api/reports"],
  });
}

// Daily Payments
export function useDailyPayment(date: string) {
  return useQuery({
    queryKey: ["/api/daily-payment", date],
    enabled: !!date,
  });
}

export function useSaveDailyPayment() {
  return useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("/api/daily-payment", {
        method: "POST",
        body: data,
        headers: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-payment"] });
    },
  });
}

// Expense Categories
export function useExpenseCategories() {
  return useQuery({
    queryKey: ["/api/expense-categories"],
  });
}

export function useCreateExpenseCategory() {
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiRequest("/api/expense-categories", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
    },
  });
}

// Expenses
export function useExpenses() {
  return useQuery({
    queryKey: ["/api/expenses"],
  });
}

export function useCreateExpense() {
  return useMutation({
    mutationFn: async (data: { categoryId: string; amount: string; expenseDate: string }) => {
      return apiRequest("/api/expenses", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses", "summary"] });
    },
  });
}

// Expenses Summary
export function useExpensesSummary(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["/api/expenses", "summary", startDate, endDate],
    queryFn: async () => {
      return apiRequest(`/api/expenses/summary?startDate=${startDate}&endDate=${endDate}`);
    },
    enabled: !!startDate && !!endDate,
  });
}

// Deliveries
export function useDeliveries() {
  return useQuery({
    queryKey: ["/api/deliveries"],
  });
}

export function useCreateDelivery() {
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiRequest("/api/deliveries", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliveries"] });
    },
  });
}

// Delivery Stock Entries
export function useDeliveryStockEntries() {
  return useQuery({
    queryKey: ["/api/delivery-stock"],
  });
}

export function useCreateDeliveryStockEntry() {
  return useMutation({
    mutationFn: async (data: { productId: string; quantity: number; note?: string }) => {
      return apiRequest("/api/delivery-stock", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-stock"] });
    },
  });
}

// Delivery Assignments
export function useDeliveryAssignments() {
  return useQuery({
    queryKey: ["/api/delivery-assignments"],
  });
}

export function useCreateDeliveryAssignment() {
  return useMutation({
    mutationFn: async (data: { deliveryId: string; productId: string; quantity: number; unitPriceSnapshot: string; note?: string; isPaid?: number }) => {
      return apiRequest("/api/delivery-assignments", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-assignments", "report"] });
    },
  });
}

export function useUpdateDeliveryAssignmentPaid() {
  return useMutation({
    mutationFn: async ({ id, isPaid }: { id: string; isPaid: number }) => {
      return apiRequest(`/api/delivery-assignments/${id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({ isPaid }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-assignments", "report"] });
    },
  });
}

// Delivery Assignments Report
export function useDeliveryAssignmentsReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["/api/delivery-assignments", "report", startDate, endDate],
    queryFn: async () => {
      return apiRequest(`/api/delivery-assignments/report?startDate=${startDate}&endDate=${endDate}`);
    },
    enabled: !!startDate && !!endDate,
  });
}

// Capital Movements
export function useCapitalMovements() {
  return useQuery({
    queryKey: ["/api/capital-movements"],
  });
}

export function useCreateCapitalMovement() {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/capital-movements", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Error al crear movimiento");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capital-movements"] });
    },
  });
}

// Gross Capital Movements (retiros de capital bruto)
export function useGrossCapitalMovements() {
  return useQuery({
    queryKey: ["/api/gross-capital-movements"],
  });
}

export function useCreateGrossCapitalMovement() {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/gross-capital-movements", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Error al crear retiro");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gross-capital-movements"] });
    },
  });
}
