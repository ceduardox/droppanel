import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";

interface User {
  id: string;
  name: string;
  username: string;
  isAdmin?: boolean;
}

interface LoginData {
  username: string;
  password: string;
}

interface RegisterData {
  name: string;
  username: string;
  password: string;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api", "auth", "me"],
    retry: false,
    staleTime: Infinity,
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/auth/me");
        return response;
      } catch (error) {
        return null;
      }
    },
  });

  return { user, isLoading, isAuthenticated: !!user };
}

export function useLogin() {
  return useMutation({
    mutationFn: async (data: LoginData) => {
      return apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "auth", "me"] });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: RegisterData) => {
      return apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "auth", "me"] });
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      return apiRequest("/api/auth/logout", {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
  });
}
