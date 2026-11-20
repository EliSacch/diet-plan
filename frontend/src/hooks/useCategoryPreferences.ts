import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setCategoryPreference } from "../api/category-preferences";
import type { CategoryPreference } from "../types/category-preference";
import type { DayOptions } from "../types/day";
import { isDayOptionsQuery } from "./useDay";

function withPreference(options: DayOptions | null | undefined, preference: CategoryPreference) {
  if (options === null || options === undefined) {
    return options;
  }
  return {
    ...options,
    meals: options.meals.map((meal) => ({
      ...meal,
      categories: meal.categories.map((category) =>
        category.category === preference.category
          ? { ...category, multi_select: preference.multi_select }
          : category,
      ),
    })),
  };
}

export function useSetCategoryPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preference: CategoryPreference) => setCategoryPreference(preference),
    onMutate: async (preference) => {
      await queryClient.cancelQueries({ predicate: isDayOptionsQuery });
      const previous = queryClient.getQueriesData<DayOptions | null>({
        predicate: isDayOptionsQuery,
      });
      queryClient.setQueriesData<DayOptions | null>({ predicate: isDayOptionsQuery }, (options) =>
        withPreference(options, preference),
      );
      return { previous };
    },
    onError: (_error, _preference, context) => {
      for (const [queryKey, options] of context?.previous ?? []) {
        queryClient.setQueryData(queryKey, options);
      }
    },
  });
}
