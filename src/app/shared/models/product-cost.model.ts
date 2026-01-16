export interface ProductCostImportResponse {
  importedRows: number;
  skippedNotFoundRows: number;
  notFound: ProductCostImportNotFoundRow[];
}

export interface ProductCostImportNotFoundRow {
  rowNumber: number;
  sourceProductId: string;
}
