// types/material.ts
export interface Material {
  id: string;
  name: string;
  type: string;
  description?: string;
  color?: string;
  unitOfMeasure: string;
  yieldPerKg: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  // O backend retorna supplierMaterials com include
  supplierMaterials?: {
    supplier: { name: string };
  }[];
}

export interface MaterialResponse {
  data: Material[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}