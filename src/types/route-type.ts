export interface RouteStop {
  id?: string;
  name?: string;
  address: string;
  complement?: string;    // Adicione se não tiver
  neighborhood?: string;  // Adicione se não tiver
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  notes?: string;
  order?: number;
}

export interface Route {
  userAssignedId?: string | null; // Adicione isso
  orderBy?: "DISTANCE" | "PRIORITY"; // Adicione isso
  id: string;
  title: string;
  description?: string;
  routeDate?: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "FINISHED" | "CANCELED";
  totalDistanceMeters?: number;
  totalDurationSeconds?: number;
  stops: RouteStop[];
  userAssigned?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  formattedDistance?: string;
  formattedDuration?: string;
}

export interface CreateRouteDto {
  title: string;
  description?: string;
  routeDate?: string;
  // driverLatitude: number;
  // driverLongitude: number;
  stops: RouteStop[];
  userAssignedId?: string;
  orderBy?: "DISTANCE" | "PRIORITY";
}

export interface RouteStats {
  total: number;
  byStatus: {
    scheduled: number;
    inProgress: number;
    finished: number;
    canceled: number;
  };
  totalStops: number;
  totalDistance: number;
  averageDistancePerRoute: number;
  lastRoutes: Route[];
}
