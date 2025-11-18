// import Link from 'next/link';
// import { Delivery } from '../../types/delivery';

// export default function DriversPage() {
//   const deliveries: Delivery[] = [
//     {
//       id: '1',
//       address: "Av. Paulista, 1000 - São Paulo, SP",
//       client: "João Silva",
//       status: "pending",
//       destination: {
//         lat: -23.563210,
//         lng: -46.654200
//       }
//     },
//     {
//       id: '2',
//       address: "Rua Augusta, 500 - São Paulo, SP",
//       client: "Maria Santos", 
//       status: "pending",
//       destination: {
//         lat: -23.555650,
//         lng: -46.658200
//       }
//     },
//     {
//       id: '3',
//       address: "Praça da Sé, 1 - São Paulo, SP",
//       client: "Pedro Oliveira",
//       status: "pending",
//       destination: {
//         lat: -23.550520,
//         lng: -46.633300
//       }
//     }
//   ];

//   return (
//     <div className="min-h-screen bg-gray-100 p-6">
//       <h1 className="text-2xl font-bold mb-6">Entregas Pendentes</h1>
      
//       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
//         {deliveries.map((delivery) => (
//           <div key={delivery.id} className="bg-white rounded-lg shadow-md p-6">
//             <div className="mb-4">
//               <h3 className="text-lg font-semibold text-gray-800">
//                 {delivery.client}
//               </h3>
//               <p className="text-gray-600 mt-1">{delivery.address}</p>
//             </div>
            
//             <div className="flex justify-between items-center">
//               <span className={`px-3 py-1 rounded-full text-sm font-medium ${
//                 delivery.status === 'pending' 
//                   ? 'bg-yellow-100 text-yellow-800'
//                   : 'bg-green-100 text-green-800'
//               }`}>
//                 {delivery.status === 'pending' ? 'Pendente' : 'Em Andamento'}
//               </span>
              
//               <Link 
//                 href={`/drivers/route/${delivery.id}`}
//                 className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
//               >
//                 Ver Rota
//               </Link>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// versao nova
'use client';

import Link from 'next/link';
import { Delivery } from '../../types/delivery';
import { useState } from 'react';

export default function DriversPage() {
  const [deliveries] = useState<Delivery[]>([
    {
      id: '1',
      address: "Av. Beira Mar, 1000 - Meireles, Fortaleza - CE",
      client: "João Silva",
      status: "pending",
      destination: {
        lat: -3.7188,
        lng: -38.5193
      }
    },
    {
      id: '2',
      address: "Shopping Iguatemi - Fortaleza - CE",
      client: "Maria Santos",
      status: "pending",
      destination: {
        lat: -3.7600,
        lng: -38.4800
      }
    },
    {
      id: '3',
      address: "Mercado Central de Fortaleza - Centro, Fortaleza - CE",
      client: "Pedro Oliveira",
      status: "pending",
      destination: {
        lat: -3.7278,
        lng: -38.5272
      }
    },
    {
      id: '4',
      address: "Praça do Ferreira - Centro, Fortaleza - CE",
      client: "Ana Costa",
      status: "pending",
      destination: {
        lat: -3.7286,
        lng: -38.5264
      }
    },
    {
      id: '5',
      address: "Estádio Castelão - Fortaleza - CE",
      client: "Carlos Lima",
      status: "pending",
      destination: {
        lat: -3.7969,
        lng: -38.5231
      }
    },
    {
      id: '6',
      address: "Aeroporto Internacional de Fortaleza (PIN) - Fortaleza - CE",
      client: "Fernanda Rocha",
      status: "pending",
      destination: {
        lat: -3.7763,
        lng: -38.5326
      }
    },
    {
      id: '7',
      address: "Parque do Cocó - Fortaleza - CE",
      client: "Roberto Alves",
      status: "pending",
      destination: {
        lat: -3.7500,
        lng: -38.4750
      }
    },
    {
      id: '8',
      address: "Via Sul Shopping - Fortaleza - CE",
      client: "Carla Mendes",
      status: "pending",
      destination: {
        lat: -3.7681,
        lng: -38.4908
      }
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredDeliveries = deliveries.filter(delivery =>
    delivery.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚚 Entregas em Fortaleza</h1>
          <p className="text-gray-600">Gerencie e navegue até os destinos de entrega em Fortaleza-CE</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Buscar por cliente ou endereço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Total de Entregas</div>
            <div className="text-2xl font-bold text-gray-900">{deliveries.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Pendentes</div>
            <div className="text-2xl font-bold text-yellow-600">{deliveries.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Em Andamento</div>
            <div className="text-2xl font-bold text-blue-600">0</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Concluídas</div>
            <div className="text-2xl font-bold text-green-600">0</div>
          </div>
        </div>

        {/* Deliveries Grid */}
        {filteredDeliveries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma entrega encontrada</h3>
            <p className="mt-2 text-gray-500">Tente ajustar os termos da busca</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDeliveries.map((delivery) => (
              <div key={delivery.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {delivery.client}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">ID: {delivery.id}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    delivery.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : delivery.status === 'in-progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {delivery.status === 'pending' ? 'Pendente' : 
                     delivery.status === 'in-progress' ? 'Em Andamento' : 'Entregue'}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Destino
                  </div>
                  <p className="text-gray-800 text-sm leading-relaxed">
                    {delivery.address}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-500">
                    {new Date().toLocaleDateString('pt-BR')}
                  </div>
                  <Link
                    href={`/drivers/route/${delivery.id}?address=${encodeURIComponent(delivery.address)}&client=${encodeURIComponent(delivery.client)}`}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Ver Rota
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-blue-800">Navegação por Rotas Reais em Fortaleza</h3>
              <p className="text-blue-700 text-sm mt-1">
                Utilize a funcionalidade de rotas reais para navegação precisa pelas ruas de Fortaleza, 
                com cálculo de distância e tempo real.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}