import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { getCatalogue, type CataloguePayload } from "./catalogue.functions";

export const catalogueQueryOptions = queryOptions({
  queryKey: ["catalogue"],
  queryFn: () => getCatalogue(),
  staleTime: 60_000,
});

export function useCatalogue(): CataloguePayload {
  return useSuspenseQuery(catalogueQueryOptions).data;
}
