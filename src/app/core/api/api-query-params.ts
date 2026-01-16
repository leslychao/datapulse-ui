export type ApiQueryParamPrimitive = string | number | boolean;
export type ApiQueryParams = Record<
  string,
  ApiQueryParamPrimitive | ApiQueryParamPrimitive[] | null | undefined
>;

export interface PageableQueryParams {
  page?: number;
  size?: number;
  sort?: string | string[];
}

export const buildPageableParams = (pageable?: PageableQueryParams): ApiQueryParams => {
  if (!pageable) {
    return {};
  }
  const sort = pageable.sort
    ? Array.isArray(pageable.sort)
      ? pageable.sort
      : [pageable.sort]
    : undefined;

  return {
    page: pageable.page,
    size: pageable.size,
    sort
  };
};
