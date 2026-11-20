import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listCategoryPreferences, setCategoryPreference } from "../api/category-preferences";
import type { CategoryPreference } from "../types/category-preference";
import type { DayOptions } from "../types/day";
import { isDayOptionsQuery } from "./useDay";

export const categoryPreferencesQueryKey = ["category-preferences"] as const;

export function categoryPreferencesQueryOptions() {
  return queryOptions({
    queryKey: categoryPreferencesQueryKey,
    queryFn: ({ signal }) => listCategoryPreferences(signal),
  });
}

export function useCategoryPreferences(enabled: boolean) {
  return useQuery({ ...categoryPreferencesQueryOptions(), enabled });
}

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

function withListed(current: CategoryPreference[] | undefined, preference: CategoryPreference) {
  const rest = (current ?? []).filter((item) => item.category !== preference.category);
  return preference.multi_select ? [...rest, preference] : rest;
}

export function useSetCategoryPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preference: CategoryPreference) => setCategoryPreference(preference),
    onMutate: async (preference) => {
      await queryClient.cancelQueries({ predicate: isDayOptionsQuery });
      await queryClient.cancelQueries({ queryKey: categoryPreferencesQueryKey });
      const previous = queryClient.getQueriesData<DayOptions | null>({
        predicate: isDayOptionsQuery,
      });
      const previousPreferences = queryClient.getQueryData<CategoryPreference[]>(
        categoryPreferencesQueryKey,
      );
      queryClient.setQueriesData<DayOptions | null>({ predicate: isDayOptionsQuery }, (options) =>
        withPreference(options, preference),
      );
      queryClient.setQueryData<CategoryPreference[]>(categoryPreferencesQueryKey, (current) =>
        withListed(current, preference),
      );
      return { previous, previousPreferences };
    },
    onError: (_error, _preference, context) => {
      for (const [queryKey, options] of context?.previous ?? []) {
        queryClient.setQueryData(queryKey, options);
      }
      if (context === undefined) {
        return;
      }
      if (context.previousPreferences === undefined) {
        queryClient.removeQueries({ queryKey: categoryPreferencesQueryKey });
        return;
      }
      queryClient.setQueryData(categoryPreferencesQueryKey, context.previousPreferences);
    },
  });
}
