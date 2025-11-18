export interface Delivery {
  id: string;
  address: string;
  client: string;
  status: 'pending' | 'in-progress' | 'delivered';
  destination: {
    lat: number;
    lng: number;
  };
}

export interface DriverPosition {
  lat: number;
  lng: number;
  timestamp: Date;
}

export interface RouteData {
  driverPosition: DriverPosition;
  destination: Delivery['destination'];
  polyline: [number, number][];
  distance: number;
  duration: number;
}