export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  sort?: PageSort;
}

export interface PageSort {
  empty: boolean;
  sorted: boolean;
  unsorted: boolean;
}
