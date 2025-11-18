/* eslint-disable @typescript-eslint/no-explicit-any */
// 'use client';

// import { useParams, useRouter } from 'next/navigation';
// import { useEffect, useState, useCallback, useRef } from 'react';
// import dynamic from 'next/dynamic';
// import { Delivery, DriverPosition, RouteData } from '../../../../types/delivery';

// const RouteMap = dynamic(() => import('../../../../components/RouteMap'), {
//   ssr: false,
//   loading: () => <div className="h-96 bg-gray-200 animate-pulse rounded-lg" />
// });

// // Centro de Fortaleza
// const FORTALEZA_CENTER = {
//   lat: -3.7319,
//   lng: -38.5267
// };

// const mockDeliveries: Delivery[] = [
//   {
//     id: '1',
//     address: "Praça da Sé - Centro, Fortaleza - CE",
//     client: "João Silva",
//     status: "pending",
//     destination: FORTALEZA_CENTER
//   }
// ];

// // Interface para a resposta da API OSRM
// interface OSRMRoute {
//   routes: Array<{
//     distance: number;
//     duration: number;
//     geometry: {
//       coordinates: [number, number][];
//     };
//   }>;
// }

// export default function RoutePage() {
//   const params = useParams();
//   const router = useRouter();
//   const id = params.id as string;

//   const [delivery, setDelivery] = useState<Delivery | null>(null);
//   const [routeData, setRouteData] = useState<RouteData | null>(null);
//   const [isSimulating, setIsSimulating] = useState(false);
//   const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
//   const [locationError, setLocationError] = useState<string | null>(null);
//   const [hasArrived, setHasArrived] = useState(false);
//   const [isLoadingRoute, setIsLoadingRoute] = useState(false);

//   const simulationRef = useRef<NodeJS.Timeout | null>(null);
//   const currentPositionRef = useRef<{ lat: number; lng: number } | null>(null);
//   const destinationRef = useRef<{ lat: number; lng: number } | null>(null);
//   const routeCoordinatesRef = useRef<[number, number][]>([]);
//   const currentStepIndexRef = useRef(0);

//   // Função para calcular rota usando OSRM
//   const calculateRoute = useCallback(async (startLat: number, startLng: number, endLat: number, endLng: number) => {
//     try {
//       setIsLoadingRoute(true);

//       const response = await fetch(
//         `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
//       );

//       if (!response.ok) {
//         throw new Error('Erro ao calcular rota');
//       }

//       const data: OSRMRoute = await response.json();

//       if (data.routes && data.routes.length > 0) {
//         const route = data.routes[0];
//         // Converter coordenadas [lng, lat] para [lat, lng]
//         const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);

//         return {
//           coordinates,
//           distance: route.distance / 1000, // converter metros para km
//           duration: route.duration / 60 // converter segundos para minutos
//         };
//       }

//       throw new Error('Rota não encontrada');
//     } catch (error) {
//       console.error('Erro ao calcular rota:', error);
//       throw error;
//     } finally {
//       setIsLoadingRoute(false);
//     }
//   }, []);

//   // Função para calcular distância entre dois pontos
//   const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
//     const R = 6371;
//     const dLat = (lat2 - lat1) * Math.PI / 180;
//     const dLon = (lon2 - lon1) * Math.PI / 180;
//     const a = 
//       Math.sin(dLat/2) * Math.sin(dLat/2) +
//       Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
//       Math.sin(dLon/2) * Math.sin(dLon/2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
//     return R * c;
//   }, []);

//   // Parar simulação
//   const stopSimulation = useCallback(() => {
//     console.log('Parando simulação...');
//     setIsSimulating(false);
//     if (simulationRef.current) {
//       clearInterval(simulationRef.current);
//       simulationRef.current = null;
//     }
//   }, []);

//   // Inicializar simulação com rota real
//   const initializeSimulation = useCallback(async (startLocation: { lat: number; lng: number }) => {
//     if (!destinationRef.current) return;

//     try {
//       currentPositionRef.current = { ...startLocation };
//       currentStepIndexRef.current = 0;

//       // Calcular rota real usando OSRM
//       const routeInfo = await calculateRoute(
//         startLocation.lat, 
//         startLocation.lng, 
//         destinationRef.current.lat, 
//         destinationRef.current.lng
//       );

//       routeCoordinatesRef.current = routeInfo.coordinates;

//       setRouteData({
//         driverPosition: {
//           ...startLocation,
//           timestamp: new Date()
//         },
//         destination: destinationRef.current,
//         polyline: routeInfo.coordinates,
//         distance: routeInfo.distance,
//         duration: Math.round(routeInfo.duration)
//       });

//       console.log('Rota calculada:', routeInfo.coordinates.length, 'pontos');

//     } catch (error) {
//       console.error('Erro ao inicializar simulação:', error);
//       // Fallback: rota em linha reta
//       const polyline: [number, number][] = [
//         [startLocation.lat, startLocation.lng],
//         [destinationRef.current.lat, destinationRef.current.lng]
//       ];

//       const distance = calculateDistance(
//         startLocation.lat, 
//         startLocation.lng, 
//         destinationRef.current.lat, 
//         destinationRef.current.lng
//       );

//       routeCoordinatesRef.current = polyline;

//       setRouteData({
//         driverPosition: {
//           ...startLocation,
//           timestamp: new Date()
//         },
//         destination: destinationRef.current,
//         polyline,
//         distance,
//         duration: Math.round(distance * 3)
//       });
//     }
//   }, [calculateRoute, calculateDistance]);

//   // Obter localização do usuário
//   const getUserLocation = useCallback(async () => {
//     if (!navigator.geolocation) {
//       const errorMessage = 'Geolocalização não suportada pelo navegador';
//       setLocationError(errorMessage);
//       // Usar localização padrão
//       const defaultLocation = { lat: -3.7900, lng: -38.5800 };
//       setUserLocation(defaultLocation);
//       await initializeSimulation(defaultLocation);
//       return;
//     }

//     setLocationError(null);
//     setHasArrived(false);

//     navigator.geolocation.getCurrentPosition(
//       async (position) => {
//         const location = {
//           lat: position.coords.latitude,
//           lng: position.coords.longitude
//         };
//         setUserLocation(location);
//         await initializeSimulation(location);
//       },
//       async (error) => {
//         const errorMessage = 'Erro ao obter localização';
//         console.error('Erro de geolocalização:', error);
//         setLocationError(errorMessage);

//         // Usar localização padrão
//         const defaultLocation = { lat: -3.7900, lng: -38.5800 };
//         setUserLocation(defaultLocation);
//         await initializeSimulation(defaultLocation);
//       },
//       {
//         enableHighAccuracy: true,
//         timeout: 10000,
//         maximumAge: 60000
//       }
//     );
//   }, [initializeSimulation]);

//   // Função principal de atualização seguindo a rota
//   const updateDriverPosition = useCallback(() => {
//     const coordinates = routeCoordinatesRef.current;
//     const currentStepIndex = currentStepIndexRef.current;

//     if (!coordinates.length || currentStepIndex >= coordinates.length - 1) {
//       console.log('Chegou ao destino!');
//       setHasArrived(true);
//       stopSimulation();
//       return;
//     }

//     // Avança para o próximo ponto da rota
//     const nextStepIndex = currentStepIndex + 1;
//     const nextCoordinate = coordinates[nextStepIndex];

//     const newPosition: DriverPosition = {
//       lat: nextCoordinate[0],
//       lng: nextCoordinate[1],
//       timestamp: new Date()
//     };

//     // Atualizar referências
//     currentPositionRef.current = { lat: nextCoordinate[0], lng: nextCoordinate[1] };
//     currentStepIndexRef.current = nextStepIndex;

//     // Calcular distância restante (do ponto atual até o final)
//     let remainingDistance = 0;
//     for (let i = nextStepIndex; i < coordinates.length - 1; i++) {
//       remainingDistance += calculateDistance(
//         coordinates[i][0], 
//         coordinates[i][1], 
//         coordinates[i + 1][0], 
//         coordinates[i + 1][1]
//       );
//     }

//     // Tempo estimado baseado na velocidade média (40 km/h)
//     const remainingDuration = Math.round((remainingDistance / 40) * 60);

//     setRouteData(prev => prev ? {
//       ...prev,
//       driverPosition: newPosition,
//       polyline: coordinates.slice(nextStepIndex),
//       distance: remainingDistance,
//       duration: remainingDuration
//     } : null);

//     console.log('Posição atualizada:', { 
//       step: `${nextStepIndex + 1}/${coordinates.length}`,
//       distance: remainingDistance.toFixed(2) 
//     });

//     // Verificar se chegou ao destino
//     if (nextStepIndex >= coordinates.length - 1) {
//       setHasArrived(true);
//       stopSimulation();
//     }
//   }, [calculateDistance, stopSimulation]);

//   // Iniciar simulação
//   const startSimulation = useCallback(() => {
//     if (isSimulating || !routeCoordinatesRef.current.length) {
//       console.log('Não pode iniciar:', { 
//         isSimulating, 
//         hasRoute: routeCoordinatesRef.current.length > 0 
//       });
//       return;
//     }

//     console.log('Iniciando simulação...');
//     setIsSimulating(true);
//     setHasArrived(false);

//     // Limpar qualquer intervalo existente
//     if (simulationRef.current) {
//       clearInterval(simulationRef.current);
//     }

//     // Iniciar novo intervalo (mais rápido para movimento suave)
//     simulationRef.current = setInterval(() => {
//       updateDriverPosition();
//     }, 500); // Atualizar a cada 0.5 segundos
//   }, [isSimulating, updateDriverPosition]);

//   // Reiniciar simulação
//   const restartSimulation = useCallback(async () => {
//     console.log('Reiniciando simulação...');
//     stopSimulation();
//     setHasArrived(false);
//     currentStepIndexRef.current = 0;
//     await getUserLocation();
//   }, [stopSimulation, getUserLocation]);

//   // Buscar delivery
//   useEffect(() => {
//     const foundDelivery = mockDeliveries.find(d => d.id === id);
//     if (foundDelivery) {
//       const timer = setTimeout(() => {
//         setDelivery(foundDelivery);
//         destinationRef.current = foundDelivery.destination;
//       }, 0);

//       return () => clearTimeout(timer);
//     }
//   }, [id]);

//   // Obter localização quando o delivery for carregado
//   useEffect(() => {
//     if (delivery && !userLocation) {
//       const rafId = requestAnimationFrame(() => {
//         getUserLocation();
//       });

//       return () => cancelAnimationFrame(rafId);
//     }
//   }, [delivery, userLocation, getUserLocation]);

//   // Limpar intervalo ao desmontar
//   useEffect(() => {
//     return () => {
//       if (simulationRef.current) {
//         clearInterval(simulationRef.current);
//       }
//     };
//   }, []);

//   if (!delivery) {
//     return (
//       <div className="min-h-screen bg-gray-100 flex items-center justify-center">
//         <div className="text-center">
//           <h1 className="text-2xl font-bold text-gray-900">Entrega não encontrada</h1>
//           <button
//             onClick={() => router.push('/drivers')}
//             className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
//           >
//             Voltar para Entregas
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-100">
//       {/* Header */}
//       <div className="bg-white shadow-sm border-b">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
//           <div className="flex justify-between items-center">
//             <div>
//               <h1 className="text-2xl font-bold text-gray-900">
//                 Navegação por Rotas Reais
//               </h1>
//               <p className="text-gray-600 mt-1">{delivery.address}</p>
//             </div>
//             <button
//               onClick={() => router.push('/drivers')}
//               className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
//             >
//               Voltar
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Conteúdo */}
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
//         {/* Controles */}
//         <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
//           <h2 className="text-lg font-semibold mb-4">🛣️ Navegação por Ruas</h2>

//           {isLoadingRoute && (
//             <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
//               <p className="text-sm text-blue-800 flex items-center gap-2">
//                 <span className="animate-spin">⏳</span>
//                 Calculando rota real pelas ruas...
//               </p>
//             </div>
//           )}

//           {!userLocation && !locationError && !isLoadingRoute && (
//             <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
//               <p className="text-sm text-blue-800">⏳ Obtendo sua localização...</p>
//             </div>
//           )}

//           {locationError && (
//             <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
//               <p className="text-sm text-yellow-800">⚠️ {locationError}</p>
//             </div>
//           )}

//           {hasArrived && (
//             <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
//               <p className="text-sm text-green-800">✅ 🎉 Você chegou ao destino pelas ruas!</p>
//             </div>
//           )}

//           <div className="flex flex-wrap gap-3 items-center">
//             {!userLocation ? (
//               <button
//                 onClick={getUserLocation}
//                 disabled={isLoadingRoute}
//                 className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors font-medium"
//               >
//                 {isLoadingRoute ? '🗺️ Calculando Rota...' : '🗺️ Calcular Rota Real'}
//               </button>
//             ) : hasArrived ? (
//               <button
//                 onClick={restartSimulation}
//                 className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
//               >
//                 🔄 Nova Navegação
//               </button>
//             ) : !isSimulating ? (
//               <button
//                 onClick={startSimulation}
//                 disabled={isLoadingRoute || !routeCoordinatesRef.current.length}
//                 className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors font-medium"
//               >
//                 🚗 Iniciar Navegação
//               </button>
//             ) : (
//               <button
//                 onClick={stopSimulation}
//                 className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
//               >
//                 ⏸️ Parar Navegação
//               </button>
//             )}

//             {userLocation && !hasArrived && routeData && (
//               <div className="flex items-center gap-4">
//                 <div className="flex items-center gap-2">
//                   <div className={`w-3 h-3 rounded-full ${isSimulating ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
//                   <span className={isSimulating ? 'text-green-600 font-medium' : 'text-gray-600'}>
//                     {isSimulating ? `Navegando... (${currentStepIndexRef.current + 1}/${routeCoordinatesRef.current.length})` : 'Rota calculada'}
//                   </span>
//                 </div>
//               </div>
//             )}
//           </div>

//           {routeData && (
//             <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
//               <div className="text-center p-3 bg-gray-50 rounded-lg">
//                 <div className="text-gray-600">Distância</div>
//                 <div className="font-bold text-lg">{routeData.distance.toFixed(1)} km</div>
//               </div>
//               <div className="text-center p-3 bg-gray-50 rounded-lg">
//                 <div className="text-gray-600">Tempo</div>
//                 <div className="font-bold text-lg">{routeData.duration} min</div>
//               </div>
//               <div className="text-center p-3 bg-gray-50 rounded-lg">
//                 <div className="text-gray-600">Pontos</div>
//                 <div className="font-bold text-lg">{routeCoordinatesRef.current.length}</div>
//               </div>
//             </div>
//           )}
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {/* Mapa */}
//           <div className="lg:col-span-2">
//             <div className="bg-white rounded-lg shadow-sm p-4">
//               <h2 className="text-lg font-semibold mb-4">
//                 {userLocation ? 'Navegação por Rotas Reais' : 'Aguardando localização...'}
//               </h2>
//               {routeData ? (
//                 <RouteMap
//                   driverPosition={routeData.driverPosition}
//                   destination={routeData.destination}
//                   polyline={routeData.polyline}
//                 />
//               ) : (
//                 <div className="h-96 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
//                   <span className="text-gray-500">
//                     {isLoadingRoute ? 'Calculando rota pelas ruas...' : 'Clique em "Calcular Rota Real"'}
//                   </span>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Informações */}
//           <div className="space-y-6">
//             <div className="bg-white rounded-lg shadow-sm p-6">
//               <h3 className="text-lg font-semibold mb-4">📍 Informações</h3>
//               <div className="space-y-3">
//                 <div>
//                   <span className="text-gray-600">Cliente:</span>
//                   <p className="font-medium">{delivery.client}</p>
//                 </div>
//                 <div>
//                   <span className="text-gray-600">Destino:</span>
//                   <p className="font-medium">{delivery.address}</p>
//                 </div>
//                 <div>
//                   <span className="text-gray-600">Status:</span>
//                   <span className={`ml-2 px-2 py-1 text-sm rounded-full ${
//                     hasArrived 
//                       ? 'bg-green-100 text-green-800' 
//                       : isSimulating 
//                       ? 'bg-blue-100 text-blue-800' 
//                       : 'bg-gray-100 text-gray-800'
//                   }`}>
//                     {hasArrived ? 'Chegou!' : isSimulating ? 'Navegando' : 'Pronto'}
//                   </span>
//                 </div>
//               </div>
//             </div>

//             <div className="bg-white rounded-lg shadow-sm p-6">
//               <h3 className="text-lg font-semibold mb-4">💡 Sobre a Rota</h3>
//               <div className="space-y-2 text-sm text-gray-600">
//                 <p>• <strong>Rotas reais</strong> calculadas pelo OpenStreetMap</p>
//                 <p>• <strong>Movimento pelas ruas</strong> em vez de linha reta</p>
//                 <p>• <strong>Velocidade realista</strong> de 40 km/h</p>
//                 <p>• <strong>Atualização suave</strong> a cada 0.5 segundos</p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// versao nova
'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Delivery, DriverPosition, RouteData } from '../../../../types/delivery';

const RouteMap = dynamic(() => import('../../../../components/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
      <span className="text-gray-500">Carregando mapa...</span>
    </div>
  )
});

// Centro de Fortaleza
const FORTALEZA_CENTER = {
  lat: -3.7319,
  lng: -38.5267
};

const mockDeliveries: Delivery[] = [
  {
    id: '1',
    address: "Praça da Sé - Centro, Fortaleza - CE",
    client: "João Silva",
    status: "pending",
    destination: FORTALEZA_CENTER
  },
  {
    id: '2',
    address: "Av. Beira Mar, Fortaleza - CE",
    client: "Maria Santos",
    status: "pending",
    destination: { lat: -3.7188, lng: -38.5193 }
  }
];

// Interfaces para a API OSRM
interface OSRMRoute {
  routes: Array<{
    distance: number;
    duration: number;
    geometry: {
      coordinates: [number, number][];
    };
    legs?: Array<{
      steps: Array<{
        distance: number;
        duration: number;
        maneuver: {
          instruction: string;
          type: number;
        };
        name?: string;
      }>;
    }>;
  }>;
  waypoints?: Array<{
    location: [number, number];
    name: string;
  }>;
}

interface RouteStep {
  distance: number;
  duration: number;
  instruction: string;
  type: number;
  name?: string;
}

export default function RoutePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationSpeed, setSimulationSpeed] = useState(500);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  const currentPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const destinationRef = useRef<{ lat: number; lng: number } | null>(null);
  const routeCoordinatesRef = useRef<[number, number][]>([]);
  const currentStepIndexRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Função para calcular distância entre dois pontos
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Função para geocodificar endereço
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number }> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=br`,
        {
          headers: {
            'User-Agent': 'DeliveryApp/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro na requisição de geocodificação');
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        throw new Error('Endereço não encontrado');
      }

      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    } catch (error) {
      console.error('Erro na geocodificação:', error);
      return FORTALEZA_CENTER;
    }
  };

  // Função para calcular rota usando OSRM
  const calculateRoute = useCallback(async (startLat: number, startLng: number, endLat: number, endLng: number) => {
    try {
      setIsLoadingRoute(true);
      setError(null);

      // Abortar requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`,
        {
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao calcular rota');
      }

      const data: OSRMRoute = await response.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error('Nenhuma rota encontrada');
      }

      const route = data.routes[0];
      const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);

      // Extrair passos da rota
      const steps: RouteStep[] = [];
      if (route.legs?.[0]?.steps) {
        route.legs[0].steps.forEach((step: any) => {
          steps.push({
            distance: step.distance,
            duration: step.duration,
            instruction: step.maneuver?.instruction || 'Siga em frente',
            type: step.maneuver?.type || 0,
            name: step.name || ''
          });
        });
      }

      setRouteSteps(steps);

      return {
        coordinates,
        distance: route.distance / 1000, // km
        duration: Math.max(1, Math.round(route.duration / 60)), // minutos, mínimo 1
        steps
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Requisição de rota cancelada');
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao calcular rota';
      setError(errorMessage);
      console.error('Erro ao calcular rota:', error);

      // Fallback: rota em linha reta
      const fallbackDistance = calculateDistance(startLat, startLng, endLat, endLng);
      const fallbackPolyline: [number, number][] = [
        [startLat, startLng],
        [endLat, endLng]
      ];

      return {
        coordinates: fallbackPolyline,
        distance: fallbackDistance,
        duration: Math.max(1, Math.round(fallbackDistance * 3)), // Estimativa de 3 min/km
        steps: []
      };
    } finally {
      setIsLoadingRoute(false);
    }
  }, [calculateDistance]);

  // Calcular progresso da rota
  const calculateProgress = useCallback(() => {
    if (!routeCoordinatesRef.current.length) return 0;
    const totalPoints = routeCoordinatesRef.current.length;
    const currentPoint = currentStepIndexRef.current;
    return Math.min(100, (currentPoint / totalPoints) * 100);
  }, []);

  // Parar simulação
  const stopSimulation = useCallback(() => {
    console.log('Parando simulação...');
    setIsSimulating(false);
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Inicializar simulação com rota real
 // CORREÇÃO: Inicializar simulação com rota real
const initializeSimulation = useCallback(async (startLocation: { lat: number; lng: number }) => {
  if (!destinationRef.current) {
    console.error('Destino não definido');
    return;
  }

  try {
    console.log('Inicializando simulação...');
    currentPositionRef.current = { ...startLocation };
    currentStepIndexRef.current = 0;
    setCurrentStep(0);
    setHasArrived(false);
    
    const routeInfo = await calculateRoute(
      startLocation.lat, 
      startLocation.lng, 
      destinationRef.current.lat, 
      destinationRef.current.lng
    );
    
    if (!routeInfo) {
      throw new Error('Falha ao calcular rota');
    }
    
    routeCoordinatesRef.current = routeInfo.coordinates;
    
    // CORREÇÃO: Inicializar com a polilinha completa
    setRouteData({
      driverPosition: {
        ...startLocation,
        timestamp: new Date()
      },
      destination: destinationRef.current,
      polyline: routeInfo.coordinates, // ✅ Polilinha completa no início
      distance: routeInfo.distance,
      duration: routeInfo.duration
    });

    console.log('Rota calculada:', {
      pontos: routeInfo.coordinates.length,
      distancia: routeInfo.distance,
      duracao: routeInfo.duration
    });
    
  } catch (error) {
    console.error('Erro ao inicializar simulação:', error);
    setError('Erro ao calcular rota. Usando rota alternativa.');
  }
}, [calculateRoute]);

  // Função auxiliar para erros de geolocalização
  const getGeolocationError = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Permissão de localização negada. Usando localização padrão.';
      case error.POSITION_UNAVAILABLE:
        return 'Localização indisponível. Usando localização padrão.';
      case error.TIMEOUT:
        return 'Tempo limite excedido. Usando localização padrão.';
      default:
        return 'Erro ao obter localização. Usando localização padrão.';
    }
  };

  // Obter localização do usuário
  const getUserLocation = useCallback(async () => {
    console.log('Obtendo localização...');

    if (!navigator.geolocation) {
      const errorMessage = 'Geolocalização não suportada pelo navegador';
      setLocationError(errorMessage);
      const defaultLocation = { lat: -3.7900, lng: -38.5800 };
      setUserLocation(defaultLocation);
      await initializeSimulation(defaultLocation);
      return;
    }

    setLocationError(null);
    setHasArrived(false);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log('Localização obtida:', location);
        setUserLocation(location);
        await initializeSimulation(location);
      },
      async (error) => {
        console.error('Erro de geolocalização:', error);
        const errorMessage = getGeolocationError(error);
        setLocationError(errorMessage);

        // Usar localização padrão baseada no destino se disponível
        const defaultLocation = destinationRef.current
          ? {
            lat: destinationRef.current.lat + 0.01,
            lng: destinationRef.current.lng + 0.01
          }
          : { lat: -3.7900, lng: -38.5800 };

        setUserLocation(defaultLocation);
        await initializeSimulation(defaultLocation);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  }, [initializeSimulation]);

  // Função principal de atualização seguindo a rota
  // CORREÇÃO: Função principal de atualização seguindo a rota
const updateDriverPosition = useCallback(() => {
  const coordinates = routeCoordinatesRef.current;
  const currentStepIndex = currentStepIndexRef.current;

  if (!coordinates.length) {
    console.log('Sem coordenadas disponíveis');
    return;
  }

  if (currentStepIndex >= coordinates.length - 1) {
    console.log('Chegou ao destino!');
    setHasArrived(true);
    setCurrentStep(routeSteps.length - 1);
    stopSimulation();
    return;
  }

  const nextStepIndex = currentStepIndex + 1;
  const nextCoordinate = coordinates[nextStepIndex];
  
  const newPosition: DriverPosition = {
    lat: nextCoordinate[0],
    lng: nextCoordinate[1],
    timestamp: new Date()
  };

  currentPositionRef.current = { lat: nextCoordinate[0], lng: nextCoordinate[1] };
  currentStepIndexRef.current = nextStepIndex;

  // Calcular passo atual baseado no progresso
  const progress = nextStepIndex / coordinates.length;
  const newStepIndex = Math.min(Math.floor(progress * routeSteps.length), routeSteps.length - 1);
  
  if (newStepIndex !== currentStep) {
    setCurrentStep(newStepIndex);
  }

  // Calcular distância e tempo restantes
  let remainingDistance = 0;
  for (let i = nextStepIndex; i < coordinates.length - 1; i++) {
    remainingDistance += calculateDistance(
      coordinates[i][0], 
      coordinates[i][1], 
      coordinates[i + 1][0], 
      coordinates[i + 1][1]
    );
  }

  const remainingDuration = Math.max(1, Math.round((remainingDistance / 40) * 60)); // 40 km/h

  // CORREÇÃO CRÍTICA: Atualizar a polilinha para mostrar apenas o trajeto RESTANTE
  const remainingPolyline = coordinates.slice(nextStepIndex);

  setRouteData(prev => prev ? {
    ...prev,
    driverPosition: newPosition,
    polyline: remainingPolyline, // ✅ AGORA mostra apenas o trajeto que falta
    distance: remainingDistance,
    duration: remainingDuration
  } : null);

  if (nextStepIndex >= coordinates.length - 1) {
    setHasArrived(true);
    stopSimulation();
  }
}, [calculateDistance, stopSimulation, routeSteps.length, currentStep]);

  // Iniciar simulação
  const startSimulation = useCallback(() => {
    if (isSimulating || !routeCoordinatesRef.current.length) {
      console.log('Não pode iniciar:', {
        isSimulating,
        hasRoute: routeCoordinatesRef.current.length > 0
      });
      return;
    }

    console.log('Iniciando simulação...');
    setIsSimulating(true);
    setHasArrived(false);
    setError(null);

    if (simulationRef.current) {
      clearInterval(simulationRef.current);
    }

    simulationRef.current = setInterval(() => {
      updateDriverPosition();
    }, simulationSpeed);
  }, [isSimulating, updateDriverPosition, simulationSpeed]);

  // Reiniciar simulação
  const restartSimulation = useCallback(async () => {
    console.log('Reiniciando simulação...');
    stopSimulation();
    setHasArrived(false);
    setError(null);
    currentStepIndexRef.current = 0;
    setCurrentStep(0);
    await getUserLocation();
  }, [stopSimulation, getUserLocation]);

  // Buscar delivery ou endereço da URL
  useEffect(() => {
    const addressFromUrl = searchParams.get('address');
    const clientFromUrl = searchParams.get('client');

    if (addressFromUrl) {
      const loadFromUrl = async () => {
        try {
          const destination = await geocodeAddress(addressFromUrl);
          const mockDelivery: Delivery = {
            id: 'url-mode',
            address: addressFromUrl,
            client: clientFromUrl || 'Cliente via URL',
            status: 'pending',
            destination
          };
          setDelivery(mockDelivery);
          destinationRef.current = destination;
        } catch (error) {
          console.error('Erro ao carregar endereço da URL');
          setError('Erro ao carregar endereço da URL');
        }
      };
      loadFromUrl();
    } else {
      const foundDelivery = mockDeliveries.find(d => d.id === id);
      if (foundDelivery) {
        setDelivery(foundDelivery);
        destinationRef.current = foundDelivery.destination;
      } else {
        setError('Entrega não encontrada');
      }
    }
  }, [id, searchParams]);

  // Obter localização quando o delivery for carregado
  useEffect(() => {
    if (delivery && !userLocation && !error) {
      const timer = setTimeout(() => {
        getUserLocation();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [delivery, userLocation, error, getUserLocation]);

  // Limpar recursos ao desmontar
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Memo para estatísticas da rota
  const routeStats = useMemo(() => {
    if (!routeData) return null;

    return [
      {
        label: "Distância Restante",
        value: `${routeData.distance.toFixed(1)} km`,
        color: "blue"
      },
      {
        label: "Tempo Estimado",
        value: `${routeData.duration} min`,
        color: "green"
      },
      {
        label: "Pontos da Rota",
        value: routeCoordinatesRef.current.length.toString(),
        color: "purple"
      },
      {
        label: "Velocidade",
        value: simulationSpeed === 1000 ? '1x' : simulationSpeed === 500 ? '2x' : '4x',
        color: "orange"
      }
    ];
  }, [routeData, simulationSpeed]);

  if (!delivery && !error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 className="text-xl font-bold text-gray-900">Carregando rota...</h1>
        </div>
      </div>
    );
  }

  if (error && !delivery) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Erro</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/drivers')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Voltar para Entregas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🗺️ Navegação por Rotas Reais
              </h1>
              <p className="text-gray-600 mt-1">{delivery?.address}</p>
            </div>
            <button
              onClick={() => router.push('/drivers')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Controles */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">🎯 Controles de Navegação</h2>

          {isLoadingRoute && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Calculando rota real pelas ruas...
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">❌ {error}</p>
            </div>
          )}

          {!userLocation && !locationError && !isLoadingRoute && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">📍 Obtendo sua localização...</p>
            </div>
          )}

          {locationError && (
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">⚠️ {locationError}</p>
            </div>
          )}

          {hasArrived && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800 flex items-center gap-2">
                ✅ 🎉 Você chegou ao destino pelas ruas!
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-center">
            {!userLocation ? (
              <button
                onClick={getUserLocation}
                disabled={isLoadingRoute}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                {isLoadingRoute ? '🗺️ Calculando Rota...' : '🗺️ Calcular Rota Real'}
              </button>
            ) : hasArrived ? (
              <button
                onClick={restartSimulation}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                🔄 Nova Navegação
              </button>
            ) : !isSimulating ? (
              <button
                onClick={startSimulation}
                disabled={isLoadingRoute || !routeCoordinatesRef.current.length}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                🚗 Iniciar Navegação
              </button>
            ) : (
              <button
                onClick={stopSimulation}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                ⏸️ Parar Navegação
              </button>
            )}

            {/* Controles de Velocidade */}
            {userLocation && !hasArrived && (
              <div className="flex gap-2 items-center ml-4">
                <span className="text-sm text-gray-600">Velocidade:</span>
                <div className="flex gap-1">
                  {[1000, 500, 250].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setSimulationSpeed(speed)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${simulationSpeed === speed
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                    >
                      {speed === 1000 ? '1x' : speed === 500 ? '2x' : '4x'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {userLocation && !hasArrived && routeData && (
              <div className="flex items-center gap-4 ml-auto">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isSimulating ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className={isSimulating ? 'text-green-600 font-medium' : 'text-gray-600'}>
                    {isSimulating ? `Navegando... (${currentStepIndexRef.current + 1}/${routeCoordinatesRef.current.length})` : 'Rota calculada'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Barra de Progresso */}
          {routeData && userLocation && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progresso da Rota</span>
                <span>{Math.round(calculateProgress())}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Estatísticas da Rota */}
          {routeStats && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              {routeStats.map((stat, index) => (
                <div
                  key={index}
                  className={`text-center p-3 bg-${stat.color}-50 rounded-lg border border-${stat.color}-100`}
                >
                  <div className={`text-${stat.color}-600`}>{stat.label}</div>
                  <div className={`font-bold text-lg text-${stat.color}-800`}>{stat.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mapa */}
          <div className="lg:col-span-2">
            {/* <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">
                {userLocation ? '🗺️ Navegação por Rotas Reais' : '📍 Aguardando localização...'}
              </h2>
              {routeData ? (
                <RouteMap
                  driverPosition={routeData.driverPosition}
                  destination={routeData.destination}
                  polyline={routeData.polyline}
                  clientName={delivery?.client}
                />
              ) : (
                <div className="h-96 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">
                    {isLoadingRoute ? 'Calculando rota pelas ruas...' : 'Clique em "Calcular Rota Real"'}
                  </span>
                </div>
              )}
            </div> */}
            <div className="h-96 w-full rounded-lg overflow-hidden">
              {routeData ? (
                <RouteMap
                  driverPosition={routeData.driverPosition}
                  destination={routeData.destination}
                  polyline={routeData.polyline}
                  clientName={delivery?.client}
                />
              ) : (
                <div className="h-full bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">
                    {isLoadingRoute ? 'Calculando rota pelas ruas de Fortaleza...' : 'Clique em "Calcular Rota Real"'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Informações */}
          <div className="space-y-6">
            {/* Informações da Entrega */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">📦 Informações da Entrega</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-gray-600 text-sm">Cliente:</span>
                  <p className="font-medium">{delivery?.client}</p>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Endereço:</span>
                  <p className="font-medium">{delivery?.address}</p>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Status:</span>
                  <span className={`ml-2 px-3 py-1 text-sm rounded-full font-medium ${hasArrived
                      ? 'bg-green-100 text-green-800'
                      : isSimulating
                        ? 'bg-blue-100 text-blue-800'
                        : routeData
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                    {hasArrived ? '🎉 Chegou!' : isSimulating ? '🚗 Navegando' : routeData ? '✅ Pronto' : '⏳ Aguardando'}
                  </span>
                </div>
              </div>
            </div>

            {/* Instruções da Rota */}
            {routeSteps.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">🧭 Instruções da Rota</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {routeSteps.map((step, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border transition-colors ${index === currentStep
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                        } ${index < currentStep ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${index === currentStep
                            ? 'bg-blue-500 text-white'
                            : index < currentStep
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-300 text-gray-600'
                          }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {step.instruction}
                          </p>
                          {step.name && (
                            <p className="text-xs text-gray-500 mt-1">
                              {step.name}
                            </p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            <span>{(step.distance / 1000).toFixed(1)} km</span>
                            <span>{(step.duration / 60).toFixed(0)} min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sobre a Rota */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">💡 Sobre a Navegação</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p className="flex items-center gap-2">
                  <span className="text-blue-500">•</span>
                  <strong>Rotas reais</strong> calculadas pelo OpenStreetMap
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-500">•</span>
                  <strong>Movimento pelas ruas</strong> em vez de linha reta
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-purple-500">•</span>
                  <strong>Velocidade realista</strong> de 40 km/h
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-orange-500">•</span>
                  <strong>Atualização suave</strong> com diferentes velocidades
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-red-500">•</span>
                  <strong>Instruções detalhadas</strong> para cada trecho
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}