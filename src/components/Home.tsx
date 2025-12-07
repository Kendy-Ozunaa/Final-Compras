import { ShoppingCart, Package, Users, Ruler, Building2,  } from 'lucide-react';

export function Home() {
  const features = [
    {
      icon: Building2,
      title: 'Departamentos',
      description: 'Gestión de departamentos organizacionales',
      color: 'bg-blue-500',
    },
    {
      icon: Ruler,
      title: 'Unidades de Medida',
      description: 'Catálogo de unidades de medición',
      color: 'bg-green-500',
    },
    {
      icon: Users,
      title: 'Proveedores',
      description: 'Administración de proveedores',
      color: 'bg-orange-500',
    },
    {
      icon: Package,
      title: 'Artículos',
      description: 'Control de inventario y artículos',
      color: 'bg-teal-500',
    },
    {
      icon: ShoppingCart,
      title: 'Órdenes de Compra',
      description: 'Gestión completa de órdenes de compra',
      color: 'bg-cyan-500',
    },
    
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          Sistema de Compras
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100"
          >
            <div className={`${feature.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
              <feature.icon className="text-white" size={24} />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-600">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}
