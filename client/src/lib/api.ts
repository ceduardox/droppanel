import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import type { AppPermissions } from "./permissions";

export interface BusinessSettingsPayload {
  businessName: string;
  logoUrl: string;
  currency: string;
  timeZone: string;
  dateFormat: "dd/MM/yyyy" | "MM/dd/yyyy" | "yyyy-MM-dd";
}

// Business Settings
export function useBusinessSettings() {
  return useQuery({
    queryKey: ["/api/business-settings"],
  });
}

export function useSaveBusinessSettings() {
  return useMutation({
    mutationFn: async (data: BusinessSettingsPayload) => {
      return apiRequest("/api/business-settings", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-settings"] });
    },
  });
}

export function useUploadBusinessLogo() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      return apiRequest("/api/business-settings/logo", {
        method: "POST",
        body: formData,
        headers: {},
      }) as Promise<{ logoUrl: string }>;
    },
  });
}

export interface AdminUserRecord {
  id: string;
  name: string;
  username: string;
  isSystemAdmin: boolean;
  role: string;
  permissions: AppPermissions;
  visibleFrom?: string | null;
  commissionRate?: number;
  commissionSeller?: string;
}

export interface AdminCreateUserPayload {
  name: string;
  username: string;
  password: string;
  role: string;
  permissions: AppPermissions;
}

export interface AdminUpdateAccessPayload {
  role: string;
  permissions: AppPermissions;
}

export interface AdminUpdateUserNamePayload {
  name: string;
}

export function useAdminUsers(enabled: boolean) {
  return useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => apiRequest("/api/admin/users") as Promise<AdminUserRecord[]>,
    enabled,
  });
}

export function useAdminCreateUser() {
  return useMutation({
    mutationFn: async (data: AdminCreateUserPayload) => {
      return apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
      }) as Promise<AdminUserRecord>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });
}

export function useAdminUpdateUserAccess() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AdminUpdateAccessPayload }) => {
      return apiRequest(`/api/admin/users/${id}/access`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });
}

export function useAdminUpdateUserName() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AdminUpdateUserNamePayload }) => {
      return apiRequest(`/api/admin/users/${id}/name`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api", "auth", "me"] });
    },
  });
}

export function useAdminResetUserPassword() {
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      return apiRequest(`/api/admin/users/${id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password }),
      });
    },
  });
}

// Products
export function useProducts() {
  return useQuery({
    queryKey: ["/api/products"],
  });
}

export function useProductImages() {
  return useQuery({
    queryKey: ["/api/product-images"],
  });
}

export function useDeleteProductImage() {
  return useMutation({
    mutationFn: async (imageUrl: string) => {
      const res = await fetch("/api/product-images", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        throw new Error("El servidor no tiene esta ruta actualizada. Reinicia el backend y vuelve a intentar.");
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text || "Error al eliminar imagen"}`);
      }

      return (await res.json()) as { success: boolean; affectedProducts: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/product-images"] });
    },
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
      queryClient.invalidateQueries({ queryKey: ["/api/product-images"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/product-images"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/product-images"] });
    },
  });
}

export function useToggleProductStatus() {
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest(`/api/products/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
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
    mutationFn: async (data: {
      productId: string;
      quantity: number;
      date: string;
      unitPrice: number;
      unitTransport: number;
      sellerId?: string | null;
      directorId?: string | null;
      deliveryId?: string | null;
    }) => {
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

export function useUpdateSale() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        productId?: string;
        quantity?: number;
        saleDate?: string;
        unitPrice?: string;
        unitTransport?: string;
        sellerId?: string | null;
        directorId?: string | null;
        deliveryId?: string | null;
      };
    }) => {
      return apiRequest(`/api/sales/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
  });
}

export function useDeleteSale() {
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/sales/${id}`, {
        method: "DELETE",
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

export function useUpdateExpenseCategory() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string } }) => {
      return apiRequest(`/api/expense-categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses", "summary"] });
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
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/expenses", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(error.error || "Error al crear gasto");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses", "summary"] });
    },
  });
}

export function useUpdateExpense() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { categoryId?: string; expenseDate?: string } }) => {
      return apiRequest(`/api/expenses/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses", "summary"] });
    },
  });
}

export function useDeleteExpense() {
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/expenses/${id}`, {
        method: "DELETE",
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
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
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
    mutationFn: async (data: { productId: string; quantity: number; note?: string; entryDate?: string }) => {
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

export function useUpdateDeliveryStockEntry() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { productId?: string; quantity?: number; entryDate?: string | null } }) => {
      return apiRequest(`/api/delivery-stock/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-stock"] });
    },
  });
}

export function useDeleteDeliveryStockEntry() {
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/delivery-stock/${id}`, {
        method: "DELETE",
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
    mutationFn: async (data: { deliveryId: string; productId: string; quantity: number; unitPriceSnapshot: string; note?: string; isPaid?: number; assignedAt?: string }) => {
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

export function useUpdateDeliveryAssignment() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        deliveryId: string;
        productId: string;
        quantity: number;
        unitPriceSnapshot: string;
        note?: string | null;
        assignedAt?: string | null;
      };
    }) => {
      return apiRequest(`/api/delivery-assignments/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-assignments", "report"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-assignments", "audit"] });
    },
  });
}

export function useDeleteDeliveryAssignment() {
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/delivery-assignments/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-assignments", "report"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-assignments", "audit"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-assignments", "audit"] });
    },
  });
}

export function useDeliveryAssignmentAudit(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["/api/delivery-assignments", "audit", startDate, endDate],
    queryFn: async () => {
      return apiRequest(`/api/delivery-assignments/audit?startDate=${startDate}&endDate=${endDate}`);
    },
    enabled: !!startDate && !!endDate,
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
export function useCapitalMovements(enabled = true) {
  return useQuery({
    queryKey: ["/api/capital-movements"],
    enabled,
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
export function useGrossCapitalMovements(enabled = true) {
  return useQuery({
    queryKey: ["/api/gross-capital-movements"],
    enabled,
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

export function useUpdateGrossCapitalMovement() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { description?: string; amount?: string; movementDate?: string } }) => {
      return apiRequest(`/api/gross-capital-movements/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gross-capital-movements"] });
    },
  });
}

export function useDeleteGrossCapitalMovement() {
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/gross-capital-movements/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gross-capital-movements"] });
    },
  });
}

// Profit Settlements
export function useProfitSettlements(enabled = true) {
  return useQuery({
    queryKey: ["/api/profit-settlements"],
    enabled,
  });
}

export function useCreateProfitSettlement() {
  return useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("/api/profit-settlements", {
        method: "POST",
        body: data,
        headers: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profit-settlements"] });
    },
  });
}

export function useUpdateProfitSettlement() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      return apiRequest(`/api/profit-settlements/${id}`, {
        method: "PUT",
        body: data,
        headers: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profit-settlements"] });
    },
  });
}

export function useDeleteProfitSettlement() {
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/profit-settlements/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profit-settlements"] });
    },
  });
}

// Sellers
export function useSellers() {
  return useQuery({
    queryKey: ["/api/sellers"],
  });
}

export function useDirectors() {
  return useQuery({
    queryKey: ["/api/directors"],
  });
}

export function useCreateDirector() {
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiRequest("/api/directors", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/directors"] });
    },
  });
}

export function useUpdateDirectorStatus() {
  return useMutation({
    mutationFn: async ({ directorId, isActive }: { directorId: string; isActive: boolean }) => {
      return apiRequest(`/api/directors/${directorId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/directors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sellers"] });
    },
  });
}

export function useUpdateDirectorReportVisibility() {
  return useMutation({
    mutationFn: async ({
      directorId,
      showProfitInReport,
    }: {
      directorId: string;
      showProfitInReport: boolean;
    }) => {
      return apiRequest(`/api/directors/${directorId}/report-visibility`, {
        method: "PATCH",
        body: JSON.stringify({ showProfitInReport }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/directors"] });
    },
  });
}

export function useDirectorExpenses() {
  return useQuery({
    queryKey: ["/api/director-expenses"],
  });
}

export function useCreateDirectorExpense() {
  return useMutation({
    mutationFn: async (data: { directorId: string | null; description: string; amount: string; expenseDate: string }) => {
      return apiRequest("/api/director-expenses", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director-expenses"] });
    },
  });
}

export function useDeleteDirectorExpense() {
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/director-expenses/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director-expenses"] });
    },
  });
}

export function useCreateSeller() {
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiRequest("/api/sellers", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers"] });
    },
  });
}

export function useUpdateSellerStatus() {
  return useMutation({
    mutationFn: async ({ sellerId, isActive }: { sellerId: string; isActive: boolean }) => {
      return apiRequest(`/api/sellers/${sellerId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller-sales"] });
    },
  });
}

export function useAssignSellerDirector() {
  return useMutation({
    mutationFn: async ({
      sellerId,
      data,
    }: {
      sellerId: string;
      data: { directorId: string | null; effectiveFrom: string };
    }) => {
      return apiRequest(`/api/sellers/${sellerId}/director`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }) as Promise<{ seller: any; affectedSales: number }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller-sales"] });
    },
  });
}

// Seller Sales
export function useSellerSales() {
  return useQuery({
    queryKey: ["/api/seller-sales"],
  });
}

export function useCreateSellerSale() {
  return useMutation({
    mutationFn: async (data: { sellerId: string; productId: string; quantity: number; unitPrice: string; saleDate: string }) => {
      return apiRequest("/api/seller-sales", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller-sales"] });
    },
  });
}

export function useUpdateSellerSale() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { productId?: string; quantity?: number; unitPrice?: string } }) => {
      return apiRequest(`/api/seller-sales/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller-sales"] });
    },
  });
}

export function useDeleteSellerSale() {
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/seller-sales/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller-sales"] });
    },
  });
}
