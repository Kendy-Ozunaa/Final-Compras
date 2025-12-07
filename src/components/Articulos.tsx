import { useState, useEffect } from 'react';
import { supabase, Articulo, UnidadMedida } from '../lib/supabase';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

export function Articulos() {
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    descripcion: '',
    marca: '',
    unidad_medida_id: '',
    existencia: 0,
    estado: true,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchArticulos();
    fetchUnidades();
  }, []);

  const fetchArticulos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('articulos')
        .select(`
          *,
          unidades_medida (
            id,
            descripcion
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticulos(data || []);
    } catch (err) {
      setError('Error al cargar artículos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnidades = async () => {
    try {
      const { data, error } = await supabase
        .from('unidades_medida')
        .select('*')
        .eq('estado', true)
        .order('descripcion');

      if (error) throw error;
      setUnidades(data || []);
    } catch (err) {
      console.error('Error al cargar unidades:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.descripcion.trim()) {
      setError('La descripción es obligatoria');
      return;
    }

    if (!formData.unidad_medida_id) {
      setError('Debe seleccionar una unidad de medida');
      return;
    }

    if (formData.existencia < 0) {
      setError('La existencia no puede ser negativa');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('articulos')
          .update({
            descripcion: formData.descripcion.trim(),
            marca: formData.marca.trim() || null,
            unidad_medida_id: formData.unidad_medida_id,
            existencia: formData.existencia,
            estado: formData.estado,
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('articulos')
          .insert([{
            descripcion: formData.descripcion.trim(),
            marca: formData.marca.trim() || null,
            unidad_medida_id: formData.unidad_medida_id,
            existencia: formData.existencia,
            estado: formData.estado,
          }]);

        if (error) throw error;
      }

      setShowModal(false);
      resetForm();
      fetchArticulos();
    } catch (err) {
      setError('Error al guardar artículo');
      console.error(err);
    }
  };

  const handleEdit = (articulo: Articulo) => {
    setEditingId(articulo.id);
    setFormData({
      descripcion: articulo.descripcion,
      marca: articulo.marca || '',
      unidad_medida_id: articulo.unidad_medida_id,
      existencia: Number(articulo.existencia),
      estado: articulo.estado,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este artículo?')) return;

    try {
      const { error } = await supabase
        .from('articulos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchArticulos();
    } catch (err) {
      setError('Error al eliminar artículo');
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      descripcion: '',
      marca: '',
      unidad_medida_id: '',
      existencia: 0,
      estado: true
    });
    setEditingId(null);
    setError('');
  };

  const filteredArticulos = articulos.filter((art) =>
    art.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (art.marca && art.marca.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Artículos</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Nuevo Artículo
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar artículos..."
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
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marca
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Existencia
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
              {filteredArticulos.map((articulo) => (
                <tr key={articulo.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {articulo.descripcion}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {articulo.marca || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {articulo.unidades_medida?.descripcion || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {articulo.existencia}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        articulo.estado
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {articulo.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(articulo)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(articulo.id)}
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
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? 'Editar Artículo' : 'Nuevo Artículo'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción *
                </label>
                <input
                  type="text"
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descripción del artículo"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marca
                </label>
                <input
                  type="text"
                  value={formData.marca}
                  onChange={(e) =>
                    setFormData({ ...formData, marca: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Marca del artículo"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidad de Medida *
                </label>
                <select
                  value={formData.unidad_medida_id}
                  onChange={(e) =>
                    setFormData({ ...formData, unidad_medida_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccione una unidad</option>
                  {unidades.map((unidad) => (
                    <option key={unidad.id} value={unidad.id}>
                      {unidad.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Existencia *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.existencia}
                  onChange={(e) =>
                    setFormData({ ...formData, existencia: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
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
