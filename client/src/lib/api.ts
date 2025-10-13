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
