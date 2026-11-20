import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCustomOption, deleteCustomOption } from "../api/custom-options";
import type { CustomOptionInput } from "../types/custom-option";
import { isDayOptionsQuery } from "./useDay";

export function useCreateCustomOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (option: CustomOptionInput) => createCustomOption(option),
    onSuccess: () => queryClient.invalidateQueries({ predicate: isDayOptionsQuery }),
  });
}

export function useDeleteCustomOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCustomOption(id),
    onSuccess: () => queryClient.invalidateQueries({ predicate: isDayOptionsQuery }),
  });
}
