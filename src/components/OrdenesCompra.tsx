import { useState, useEffect } from 'react';
import { supabase, OrdenCompra, Articulo, Proveedor } from '../lib/supabase';
import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { generarAsientoCompra } from "../api/contabilidad";
import { createAccountingEntry } from "../api/accountingEntries";


export function OrdenesCompra() {
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    estado: 'Pendiente' as 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Completada',
    articulo_id: '',
    cantidad: 1,
    costo_unitario: 0,
    proveedor_id: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrdenes();
    fetchArticulos();
    fetchProveedores();
  }, []);

  const fetchOrdenes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ordenes_compra')
        .select(`
          *,
          articulos (
            id,
            descripcion,
            marca
          ),
          proveedores (
            id,
            nombre_comercial
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrdenes(data || []);
    } catch (err) {
      setError('Error al cargar órdenes de compra');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchArticulos = async () => {
    try {
      const { data, error } = await supabase
        .from('articulos')
        .select('*')
        .eq('estado', true)
        .order('descripcion');

      if (error) throw error;
      setArticulos(data || []);
    } catch (err) {
      console.error('Error al cargar artículos:', err);
    }
  };

  const fetchProveedores = async () => {
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .eq('estado', true)
        .order('nombre_comercial');

      if (error) throw error;
      setProveedores(data || []);
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
    }
  };

  const generateNumeroOrden = async (): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('generate_numero_orden');
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error generando número de orden:', err);
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `OC-${date}-${random}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const isApproved = formData.estado === "Aprobada";

    try {
      let ordenId = editingId;
      let creada = null;

      // ----- 1) CREAR O EDITAR ORDEN -----
      if (editingId) {
        const { error } = await supabase
          .from("ordenes_compra")
          .update({
            fecha: formData.fecha,
            estado: formData.estado,
            articulo_id: formData.articulo_id,
            cantidad: formData.cantidad,
            costo_unitario: formData.costo_unitario,
            proveedor_id: formData.proveedor_id,
          })
          .eq("id", editingId);

        if (error) throw error;

      } else {
        const numeroOrden = await generateNumeroOrden();

        const { data, error } = await supabase
          .from("ordenes_compra")
          .insert([
            {
              numero_orden: numeroOrden,
              fecha: formData.fecha,
              estado: formData.estado,
              articulo_id: formData.articulo_id,
              cantidad: formData.cantidad,
              costo_unitario: formData.costo_unitario,
              proveedor_id: formData.proveedor_id,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        creada = data;
        ordenId = data.id;
      }

      // ----- 2) GENERAR ASIENTO AUTOMÁTICO SI ES APROBADA -----
      if (isApproved) {
        const { data: ordenCompleta, error: errOC } = await supabase
          .from("ordenes_compra")
          .select(`
            *,
            articulos ( descripcion ),
            proveedores ( nombre_comercial )
          `)
          .eq("id", ordenId)
          .single();

        if (errOC) throw errOC;

        await generarAsientoCompra(ordenCompleta);
      }

      setShowModal(false);
      resetForm();
      fetchOrdenes();

    } catch (err) {
      console.error(err);
      setError("Error guardando la orden o generando asiento contable.");
    }
  };

  const handleEdit = (orden: OrdenCompra) => {
    setEditingId(orden.id);
    setFormData({
      fecha: orden.fecha,
      estado: orden.estado,
      articulo_id: orden.articulo_id,
      cantidad: Number(orden.cantidad),
      costo_unitario: Number(orden.costo_unitario),
      proveedor_id: orden.proveedor_id,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta orden de compra?')) return;

    try {
      const { error } = await supabase
        .from('ordenes_compra')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchOrdenes();
    } catch (err) {
      setError('Error al eliminar orden de compra');
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      estado: 'Pendiente',
      articulo_id: '',
      cantidad: 1,
      costo_unitario: 0,
      proveedor_id: '',
    });
    setEditingId(null);
    setError('');
  };

  const filteredOrdenes = ordenes.filter((orden) => {
    const matchesSearch =
      orden.numero_orden.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orden.articulos?.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orden.proveedores?.nombre_comercial.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEstado = !estadoFilter || orden.estado === estadoFilter;

    return matchesSearch && matchesEstado;
  });

  const getEstadoBadgeClass = (estado: string) => {
    const classes = {
      Pendiente: 'bg-yellow-100 text-yellow-800',
      Aprobada: 'bg-green-100 text-green-800',
      Rechazada: 'bg-red-100 text-red-800',
      Completada: 'bg-blue-100 text-blue-800',
    };
    return classes[estado as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(value);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Órdenes de Compra</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Nueva Orden
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar órdenes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Aprobada">Aprobada</option>
              <option value="Rechazada">Rechazada</option>
              <option value="Completada">Completada</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Orden</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artículo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Unit.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrdenes.map((orden) => (
                  <tr key={orden.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {orden.numero_orden}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(orden.fecha).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {orden.articulos?.descripcion || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {orden.proveedores?.nombre_comercial || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {orden.cantidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(Number(orden.costo_unitario))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(Number(orden.subtotal))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadgeClass(orden.estado)}`}>
                        {orden.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(orden)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(orden.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha *</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado *</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as typeof formData.estado })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Aprobada">Aprobada</option>
                    <option value="Rechazada">Rechazada</option>
                    <option value="Completada">Completada</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor *</label>
                <select
                  value={formData.proveedor_id}
                  onChange={(e) => setFormData({ ...formData, proveedor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccione un proveedor</option>
                  {proveedores.map((proveedor) => (
                    <option key={proveedor.id} value={proveedor.id}>
                      {proveedor.nombre_comercial}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Artículo *</label>
                <select
                  value={formData.articulo_id}
                  onChange={(e) => setFormData({ ...formData, articulo_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccione un artículo</option>
                  {articulos.map((articulo) => (
                    <option key={articulo.id} value={articulo.id}>
                      {articulo.descripcion} {articulo.marca ? `- ${articulo.marca}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Costo Unitario *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.costo_unitario}
                    onChange={(e) => setFormData({ ...formData, costo_unitario: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-700">Subtotal:</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(formData.cantidad * formData.costo_unitario)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


// import { useState, useEffect } from 'react';
// import { supabase, OrdenCompra, Articulo, Proveedor } from '../lib/supabase';
// import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
// import { createAccountingEntry } from '../api/accountingEntries';
// import { generarAsientoCompra } from "../api/contabilidad";


// export function OrdenesCompra() {
//   const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
//   const [articulos, setArticulos] = useState<Articulo[]>([]);
//   const [proveedores, setProveedores] = useState<Proveedor[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showModal, setShowModal] = useState(false);
//   const [editingId, setEditingId] = useState<string | null>(null);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [estadoFilter, setEstadoFilter] = useState<string>('');
//   const [formData, setFormData] = useState({
//     fecha: new Date().toISOString().split('T')[0],
//     estado: 'Pendiente' as 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Completada',
//     articulo_id: '',
//     cantidad: 1,
//     costo_unitario: 0,
//     proveedor_id: '',
//   });
//   const [error, setError] = useState('');

//   useEffect(() => {
//     fetchOrdenes();
//     fetchArticulos();
//     fetchProveedores();
//   }, []);

//   const fetchOrdenes = async () => {
//     try {
//       setLoading(true);
//       const { data, error } = await supabase
//         .from('ordenes_compra')
//         .select(`
//           *,
//           articulos (
//             id,
//             descripcion,
//             marca
//           ),
//           proveedores (
//             id,
//             nombre_comercial
//           )
//         `)
//         .order('created_at', { ascending: false });

//       if (error) throw error;
//       setOrdenes(data || []);
//     } catch (err) {
//       setError('Error al cargar órdenes de compra');
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchArticulos = async () => {
//     try {
//       const { data, error } = await supabase
//         .from('articulos')
//         .select('*')
//         .eq('estado', true)
//         .order('descripcion');

//       if (error) throw error;
//       setArticulos(data || []);
//     } catch (err) {
//       console.error('Error al cargar artículos:', err);
//     }
//   };

//   const fetchProveedores = async () => {
//     try {
//       const { data, error } = await supabase
//         .from('proveedores')
//         .select('*')
//         .eq('estado', true)
//         .order('nombre_comercial');

//       if (error) throw error;
//       setProveedores(data || []);
//     } catch (err) {
//       console.error('Error al cargar proveedores:', err);
//     }
//   };

//   const generateNumeroOrden = async (): Promise<string> => {
//     try {
//       const { data, error } = await supabase.rpc('generate_numero_orden');
//       if (error) throw error;
//       return data;
//     } catch (err) {
//       console.error('Error generando número de orden:', err);
//       const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
//       const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
//       return `OC-${date}-${random}`;
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//   e.preventDefault();
//   setError("");

//   const isApproved = formData.estado === "Aprobada" || formData.estado === "Completada";

//   try {
//     let ordenId = editingId;

//     // 1) CREAR O ACTUALIZAR ORDEN
//     if (editingId) {
//       const { error } = await supabase
//         .from("ordenes_compra")
//         .update({
//           fecha: formData.fecha,
//           estado: formData.estado,
//           articulo_id: formData.articulo_id,
//           cantidad: formData.cantidad,
//           costo_unitario: formData.costo_unitario,
//           proveedor_id: formData.proveedor_id,
//         })
//         .eq("id", editingId);

//       if (error) throw error;
//     } else {
//       const numeroOrden = await generateNumeroOrden();
//       const { data, error } = await supabase
//         .from("ordenes_compra")
//         .insert([
//           {
//             numero_orden: numeroOrden,
//             fecha: formData.fecha,
//             estado: formData.estado,
//             articulo_id: formData.articulo_id,
//             cantidad: formData.cantidad,
//             costo_unitario: formData.costo_unitario,
//             proveedor_id: formData.proveedor_id,
//             subtotal: formData.cantidad * formData.costo_unitario,
//           },
//         ])
//         .select("id");

//       if (error) throw error;
//       ordenId = data[0].id;
//     }

//     // 2) SI LA ORDEN FUE APROBADA → CREAR ASIENTO AUTOMÁTICO
//     if (isApproved) {
//       await createAccountingEntry({
//         description: `Compra aprobada OC-${ordenId}`,
//         accountId: 5001, // ← Ajusta tu cuenta contable
//         movementType: "DB",
//         amount: Number(formData.cantidad * formData.costo_unitario),
//         entryDate: new Date().toISOString().split("T")[0],
//       });
//     }

//     setShowModal(false);
//     resetForm();
//     fetchOrdenes();
//   } catch (err) {
//     console.error(err);
//     setError("Error guardando la orden o generando asiento contable.");
//   }
// };

//   const handleEdit = (orden: OrdenCompra) => {
//     setEditingId(orden.id);
//     setFormData({
//       fecha: orden.fecha,
//       estado: orden.estado,
//       articulo_id: orden.articulo_id,
//       cantidad: Number(orden.cantidad),
//       costo_unitario: Number(orden.costo_unitario),
//       proveedor_id: orden.proveedor_id,
//     });
//     setShowModal(true);
//   };

//   const handleDelete = async (id: string) => {
//     if (!confirm('¿Está seguro de eliminar esta orden de compra?')) return;

//     try {
//       const { error } = await supabase
//         .from('ordenes_compra')
//         .delete()
//         .eq('id', id);

//       if (error) throw error;
//       fetchOrdenes();
//     } catch (err) {
//       setError('Error al eliminar orden de compra');
//       console.error(err);
//     }
//   };

//   const resetForm = () => {
//     setFormData({
//       fecha: new Date().toISOString().split('T')[0],
//       estado: 'Pendiente',
//       articulo_id: '',
//       cantidad: 1,
//       costo_unitario: 0,
//       proveedor_id: '',
//     });
//     setEditingId(null);
//     setError('');
//   };

//   const filteredOrdenes = ordenes.filter((orden) => {
//     const matchesSearch =
//       orden.numero_orden.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       orden.articulos?.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       orden.proveedores?.nombre_comercial.toLowerCase().includes(searchTerm.toLowerCase());

//     const matchesEstado = !estadoFilter || orden.estado === estadoFilter;

//     return matchesSearch && matchesEstado;
//   });

//   const getEstadoBadgeClass = (estado: string) => {
//     const classes = {
//       Pendiente: 'bg-yellow-100 text-yellow-800',
//       Aprobada: 'bg-green-100 text-green-800',
//       Rechazada: 'bg-red-100 text-red-800',
//       Completada: 'bg-blue-100 text-blue-800',
//     };
//     return classes[estado as keyof typeof classes] || 'bg-gray-100 text-gray-800';
//   };

//   const formatCurrency = (value: number) => {
//     return new Intl.NumberFormat('es-DO', {
//       style: 'currency',
//       currency: 'DOP'
//     }).format(value);
//   };

//   return (
//     <div className="max-w-7xl mx-auto">
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-3xl font-bold text-gray-800">Órdenes de Compra</h1>
//         <button
//           onClick={() => {
//             resetForm();
//             setShowModal(true);
//           }}
//           className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
//         >
//           <Plus size={20} />
//           Nueva Orden
//         </button>
//       </div>

//       <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div className="relative">
//             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
//             <input
//               type="text"
//               placeholder="Buscar órdenes..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//             />
//           </div>
//           <div className="relative">
//             <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
//             <select
//               value={estadoFilter}
//               onChange={(e) => setEstadoFilter(e.target.value)}
//               className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//             >
//               <option value="">Todos los estados</option>
//               <option value="Pendiente">Pendiente</option>
//               <option value="Aprobada">Aprobada</option>
//               <option value="Rechazada">Rechazada</option>
//               <option value="Completada">Completada</option>
//             </select>
//           </div>
//         </div>
//       </div>

//       {error && (
//         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//           {error}
//         </div>
//       )}

//       <div className="bg-white rounded-lg shadow-sm overflow-hidden">
//         {loading ? (
//           <div className="p-8 text-center text-gray-500">Cargando...</div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     No. Orden
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Fecha
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Artículo
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Proveedor
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Cantidad
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Costo Unit.
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Subtotal
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Estado
//                   </th>
//                   <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Acciones
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {filteredOrdenes.map((orden) => (
//                   <tr key={orden.id} className="hover:bg-gray-50">
//                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
//                       {orden.numero_orden}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                       {new Date(orden.fecha).toLocaleDateString('es-DO')}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                       {orden.articulos?.descripcion || '-'}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                       {orden.proveedores?.nombre_comercial || '-'}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                       {orden.cantidad}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                       {formatCurrency(Number(orden.costo_unitario))}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
//                       {formatCurrency(Number(orden.subtotal))}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <span
//                         className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadgeClass(orden.estado)}`}
//                       >
//                         {orden.estado}
//                       </span>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
//                       <button
//                         onClick={() => handleEdit(orden)}
//                         className="text-blue-600 hover:text-blue-900 mr-4"
//                       >
//                         <Edit2 size={18} />
//                       </button>
//                       <button
//                         onClick={() => handleDelete(orden.id)}
//                         className="text-red-600 hover:text-red-900"
//                       >
//                         <Trash2 size={18} />
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>

//       {showModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
//             <h2 className="text-2xl font-bold mb-4">
//               {editingId ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
//             </h2>
//             <form onSubmit={handleSubmit}>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div className="mb-4">
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Fecha *
//                   </label>
//                   <input
//                     type="date"
//                     value={formData.fecha}
//                     onChange={(e) =>
//                       setFormData({ ...formData, fecha: e.target.value })
//                     }
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   />
//                 </div>

//                 <div className="mb-4">
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Estado *
//                   </label>
//                   <select
//                     value={formData.estado}
//                     onChange={(e) =>
//                       setFormData({ ...formData, estado: e.target.value as typeof formData.estado })
//                     }
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   >
//                     <option value="Pendiente">Pendiente</option>
//                     <option value="Aprobada">Aprobada</option>
//                     <option value="Rechazada">Rechazada</option>
//                     <option value="Completada">Completada</option>
//                   </select>
//                 </div>
//               </div>

//               <div className="mb-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Proveedor *
//                 </label>
//                 <select
//                   value={formData.proveedor_id}
//                   onChange={(e) =>
//                     setFormData({ ...formData, proveedor_id: e.target.value })
//                   }
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                 >
//                   <option value="">Seleccione un proveedor</option>
//                   {proveedores.map((proveedor) => (
//                     <option key={proveedor.id} value={proveedor.id}>
//                       {proveedor.nombre_comercial}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="mb-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Artículo *
//                 </label>
//                 <select
//                   value={formData.articulo_id}
//                   onChange={(e) =>
//                     setFormData({ ...formData, articulo_id: e.target.value })
//                   }
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                 >
//                   <option value="">Seleccione un artículo</option>
//                   {articulos.map((articulo) => (
//                     <option key={articulo.id} value={articulo.id}>
//                       {articulo.descripcion} {articulo.marca ? `- ${articulo.marca}` : ''}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div className="mb-4">
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Cantidad *
//                   </label>
//                   <input
//                     type="number"
//                     min="1"
//                     step="0.01"
//                     value={formData.cantidad}
//                     onChange={(e) =>
//                       setFormData({ ...formData, cantidad: parseFloat(e.target.value) || 1 })
//                     }
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                     placeholder="0"
//                   />
//                 </div>

//                 <div className="mb-4">
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Costo Unitario *
//                   </label>
//                   <input
//                     type="number"
//                     min="0"
//                     step="0.01"
//                     value={formData.costo_unitario}
//                     onChange={(e) =>
//                       setFormData({ ...formData, costo_unitario: parseFloat(e.target.value) || 0 })
//                     }
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                     placeholder="0.00"
//                   />
//                 </div>
//               </div>

//               <div className="mb-6 bg-gray-50 p-4 rounded-lg">
//                 <div className="flex justify-between items-center">
//                   <span className="text-lg font-medium text-gray-700">Subtotal:</span>
//                   <span className="text-xl font-bold text-gray-900">
//                     {formatCurrency(formData.cantidad * formData.costo_unitario)}
//                   </span>
//                 </div>
//               </div>

//               <div className="flex gap-3">
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setShowModal(false);
//                     resetForm();
//                   }}
//                   className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
//                 >
//                   Cancelar
//                 </button>
//                 <button
//                   type="submit"
//                   className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//                 >
//                   {editingId ? 'Actualizar' : 'Crear'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
