import { useState, useEffect } from 'react';
import { supabase, Proveedor } from '../lib/supabase';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { validateCedulaRNC, formatCedulaRNC } from '../utils/validation';

export function Proveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    cedula_rnc: '',
    nombre_comercial: '',
    estado: true,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProveedores();
  }, []);

  const fetchProveedores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProveedores(data || []);
    } catch (err) {
      setError('Error al cargar proveedores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.cedula_rnc.trim()) {
      setError('La Cédula/RNC es obligatoria');
      return;
    }

    if (!validateCedulaRNC(formData.cedula_rnc)) {
      setError('RNC inválido. Debe ser de 9 u 11 dígitos');
      return;
    }

    if (!formData.nombre_comercial.trim()) {
      setError('El nombre comercial es obligatorio');
      return;
    }

    try {
      const cleanedCedula = formData.cedula_rnc.replace(/[-\s]/g, '');

      if (editingId) {
        const { error } = await supabase
          .from('proveedores')
          .update({
            cedula_rnc: cleanedCedula,
            nombre_comercial: formData.nombre_comercial.trim(),
            estado: formData.estado,
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('proveedores')
          .insert([{
            cedula_rnc: cleanedCedula,
            nombre_comercial: formData.nombre_comercial.trim(),
            estado: formData.estado,
          }]);

        if (error) throw error;
      }

      setShowModal(false);
      resetForm();
      fetchProveedores();
    } catch (err: unknown) {
      const errorMessage = err as { message?: string };
      if (errorMessage?.message?.includes('duplicate')) {
        setError('Este RNC ya está registrada');
      } else {
        setError('Error al guardar proveedor');
      }
      console.error(err);
    }
  };

  const handleEdit = (proveedor: Proveedor) => {
    setEditingId(proveedor.id);
    setFormData({
      cedula_rnc: proveedor.cedula_rnc,
      nombre_comercial: proveedor.nombre_comercial,
      estado: proveedor.estado,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este proveedor?')) return;

    try {
      const { error } = await supabase
        .from('proveedores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchProveedores();
    } catch (err) {
      setError('Error al eliminar proveedor');
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({ cedula_rnc: '', nombre_comercial: '', estado: true });
    setEditingId(null);
    setError('');
  };

  const filteredProveedores = proveedores.filter((prov) =>
    prov.nombre_comercial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prov.cedula_rnc.includes(searchTerm.replace(/[-\s]/g, ''))
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Proveedores</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Nuevo Proveedor
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre o RNC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RNC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre Comercial
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProveedores.map((proveedor) => (
                <tr key={proveedor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCedulaRNC(proveedor.cedula_rnc)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {proveedor.nombre_comercial}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        proveedor.estado
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {proveedor.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(proveedor)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(proveedor.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RNC *
                </label>
                <input
                  type="text"
                  value={formData.cedula_rnc}
                  onChange={(e) =>
                    setFormData({ ...formData, cedula_rnc: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="000-0000000-0"
                  maxLength={13}
                />
                <p className="text-xs text-gray-500 mt-1">
                  9 u 11 dígitos (formato: 000-0000000-0)
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Comercial *
                </label>
                <input
                  type="text"
                  value={formData.nombre_comercial}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre_comercial: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre del proveedor"
                />
              </div>

              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.estado}
                    onChange={(e) =>
                      setFormData({ ...formData, estado: e.target.checked })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Activo</span>
                </label>
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
