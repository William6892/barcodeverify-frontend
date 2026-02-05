import { useState, useEffect } from 'react';
import { Truck, Plus, Edit, Trash2, RefreshCw, Search, X, Save } from 'lucide-react';
import { transportService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import CreateTransportCompanyModal from '../components/shipment/CreateTransportCompanyModal';
import './css/TransportCompaniesPage.css';

interface TransportCompany {
  id: number;
  name: string;
  driverName: string;
  licensePlate: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

interface EditFormData {
  name: string;
  driverName: string;
  licensePlate: string;
  phone: string;
}

export default function TransportCompaniesPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<TransportCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<TransportCompany | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    name: '',
    driverName: '',
    licensePlate: '',
    phone: ''
  });
  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = user?.role === 'Admin';

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await transportService.getAll();      
      
      if (Array.isArray(response)) {
        setCompanies(response);
      }
    } catch (error: any) {
      console.error('Error:', error);
      
      if (error.response?.status === 403) {
        toast.error('No tienes permisos para ver transportadoras');
      } else {
        toast.error('Error cargando transportadoras');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  // Crear transportadora
  const handleCreateTransportCompany = async (data: any) => {
    try {
      let response;
      
      if (isAdmin) {
        response = await transportService.createForAdmin(data);
        toast.success('Transportadora creada (modo Admin)');
      } else {
        response = await transportService.createForUser(data);
        toast.success('Transportadora creada exitosamente');
      }
      
      loadCompanies();
      return { success: true, data: response };
      
    } catch (error: any) {
      console.error('Error creando transportadora:', error);
      
      if (error.response?.status === 409) {
        toast.error('Ya existe una transportadora con esta placa');
        return { success: false, error: 'PLACA_DUPLICADA' };
      } else if (error.response?.status === 401) {
        toast.error('Debes iniciar sesión para crear una transportadora');
        return { success: false, error: 'UNAUTHORIZED' };
      } else {
        toast.error('Error creando transportadora');
        return { success: false, error: 'SERVER_ERROR' };
      }
    }
  };

  // Editar transportadora
  const handleEditClick = (company: TransportCompany) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden editar transportadoras');
      return;
    }

    setEditingCompany(company);
    setIsEditing(true);
    setEditFormData({
      name: company.name,
      driverName: company.driverName,
      licensePlate: company.licensePlate,
      phone: company.phone || ''
    });
  };

  const handleEditCancel = () => {
    setEditingCompany(null);
    setIsEditing(false);
    setEditFormData({
      name: '',
      driverName: '',
      licensePlate: '',
      phone: ''
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCompany) return;

    // Validaciones básicas
    if (!editFormData.name.trim() || !editFormData.driverName.trim() || !editFormData.licensePlate.trim()) {
      toast.error('Nombre, conductor y placa son obligatorios');
      return;
    }

    try {
      const dataToSend = {
        name: editFormData.name.trim(),
        driverName: editFormData.driverName.trim(),
        licensePlate: editFormData.licensePlate.trim().toUpperCase(),
        phone: editFormData.phone.trim() || null
      };

      await transportService.update(editingCompany.id, dataToSend);
      
      toast.success('Transportadora actualizada exitosamente');
      handleEditCancel();
      loadCompanies();
      
    } catch (error: any) {
      console.error('Error actualizando transportadora:', error);
      
      if (error.response?.status === 409) {
        toast.error('Ya existe una transportadora con esta placa');
      } else if (error.response?.status === 403) {
        toast.error('No tienes permisos para editar transportadoras');
      } else if (error.response?.status === 404) {
        toast.error('Transportadora no encontrada');
      } else {
        toast.error('Error actualizando transportadora');
      }
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden eliminar transportadoras');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar la transportadora "${name}"?`)) {
      return;
    }

    try {
      await transportService.delete(id);
      toast.success('Transportadora eliminada exitosamente');
      loadCompanies();
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('No tienes permisos para eliminar transportadoras');
      } else if (error.response?.status === 400) {
        toast.error('No se puede eliminar, tiene envíos asociados');
      } else {
        toast.error('Error eliminando transportadora');
      }
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden cambiar el estado');
      return;
    }

    try {
      await transportService.toggleStatus(id);
      toast.success(`Transportadora ${currentStatus ? 'desactivada' : 'activada'} exitosamente`);
      loadCompanies();
    } catch (error: any) {
      toast.error('Error cambiando estado');
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="transport-loading">
        <div className="transport-loading-spinner"></div>
        <p className="transport-loading-text">Cargando transportadoras...</p>
      </div>
    );
  }

  return (
    <div className="transport-page">
      <div className="transport-container">
        {/* Header */}
        <div className="transport-header">
          <div className="transport-header-content">
            <div className="transport-header-left">
              <div className="transport-title-container">
                <Truck className="transport-title-icon" />
                <div>
                  <h1 className="transport-title">Transportadoras</h1>
                  <p className="transport-subtitle">
                    {isAdmin ? 'Administra las empresas de transporte' : 'Empresas de transporte disponibles'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Botón para TODOS los usuarios autenticados */}
            {user && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="transport-create-btn"
              >
                <Plus className="transport-create-icon" />
                Nueva Transportadora
              </button>
            )}
          </div>
        </div>

        {/* Estadísticas */}
        <div className="transport-stats-grid">
          <div className="transport-stat-card">
            <p className="transport-stat-label">Total Transportadoras</p>
            <p className="transport-stat-value">{companies.length}</p>
          </div>
          <div className="transport-stat-card">
            <p className="transport-stat-label">Activas</p>
            <p className="transport-stat-value transport-stat-active">
              {companies.filter(c => c.isActive).length}
            </p>
          </div>
          <div className="transport-stat-card">
            <p className="transport-stat-label">Inactivas</p>
            <p className="transport-stat-value transport-stat-inactive">
              {companies.filter(c => !c.isActive).length}
            </p>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="transport-search-card">
          <div className="transport-search-container">
            <Search className="transport-search-icon" />
            <input
              type="text"
              placeholder="Buscar por nombre, conductor o placa..."
              className="transport-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              onClick={loadCompanies}
              className="transport-refresh-btn"
              disabled={loading}
            >
              <RefreshCw className={`transport-refresh-icon ${loading ? 'spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Lista de transportadoras */}
        <div className="transport-list-card">
          {filteredCompanies.length === 0 ? (
            <div className="transport-empty-state">
              <Truck className="transport-empty-icon" />
              <h3 className="transport-empty-title">
                {searchTerm ? 'No se encontraron resultados' : 'No hay transportadoras'}
              </h3>
              <p className="transport-empty-message">
                {searchTerm
                  ? 'Intenta con otros términos de búsqueda'
                  : user 
                    ? 'Crea tu primera transportadora para comenzar' 
                    : 'No hay transportadoras disponibles'}
              </p>
            </div>
          ) : (
            <div className="transport-table-container">
              <table className="transport-table">
                <thead className="transport-table-header">
                  <tr>
                    <th className="transport-table-th">Empresa</th>
                    <th className="transport-table-th">Conductor</th>
                    <th className="transport-table-th">Placa</th>
                    <th className="transport-table-th">Teléfono</th>
                    <th className="transport-table-th">Estado</th>
                    {isAdmin && (
                      <th className="transport-table-th">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="transport-table-body">
                  {filteredCompanies.map((company) => (
                    <tr key={company.id} className="transport-table-row">
                      <td className="transport-table-td">
                        {editingCompany?.id === company.id && isEditing ? (
                          <input
                            type="text"
                            name="name"
                            value={editFormData.name}
                            onChange={handleEditChange}
                            className="transport-edit-input"
                            placeholder="Nombre de la empresa"
                          />
                        ) : (
                          <div>
                            <div className="transport-company-name">{company.name}</div>
                            <div className="transport-company-date">
                              Creada: {new Date(company.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </td>
                      
                      <td className="transport-table-td">
                        {editingCompany?.id === company.id && isEditing ? (
                          <input
                            type="text"
                            name="driverName"
                            value={editFormData.driverName}
                            onChange={handleEditChange}
                            className="transport-edit-input"
                            placeholder="Nombre del conductor"
                          />
                        ) : (
                          <div className="transport-driver-name">{company.driverName}</div>
                        )}
                      </td>
                      
                      <td className="transport-table-td">
                        {editingCompany?.id === company.id && isEditing ? (
                          <input
                            type="text"
                            name="licensePlate"
                            value={editFormData.licensePlate}
                            onChange={handleEditChange}
                            className="transport-edit-input"
                            placeholder="Placa del vehículo"
                          />
                        ) : (
                          <span className="transport-license-plate">
                            {company.licensePlate}
                          </span>
                        )}
                      </td>
                      
                      <td className="transport-table-td">
                        {editingCompany?.id === company.id && isEditing ? (
                          <input
                            type="text"
                            name="phone"
                            value={editFormData.phone}
                            onChange={handleEditChange}
                            className="transport-edit-input"
                            placeholder="Teléfono (opcional)"
                          />
                        ) : (
                          <span className="transport-phone">
                            {company.phone || 'N/A'}
                          </span>
                        )}
                      </td>
                      
                      <td className="transport-table-td">
                        <button
                          onClick={() => handleToggleStatus(company.id, company.isActive)}
                          className={`transport-status-btn ${company.isActive ? 'transport-status-active' : 'transport-status-inactive'} ${isAdmin ? 'transport-status-btn-admin' : 'transport-status-btn-user'}`}
                          disabled={!isAdmin}
                          title={isAdmin ? "Click para cambiar estado" : "Solo administradores pueden cambiar estado"}
                        >
                          {company.isActive ? 'Activa' : 'Inactiva'}
                        </button>
                      </td>
                      
                      {/* Acciones solo para admin */}
                      {isAdmin && (
                        <td className="transport-table-td">
                          {editingCompany?.id === company.id ? (
                            <div className="transport-edit-actions">
                              <button
                                onClick={handleEditSubmit}
                                className="transport-action-btn transport-action-save"
                                title="Guardar cambios"
                              >
                                <Save className="transport-action-icon" />
                              </button>
                              <button
                                onClick={handleEditCancel}
                                className="transport-action-btn transport-action-cancel"
                                title="Cancelar edición"
                              >
                                <X className="transport-action-icon" />
                              </button>
                            </div>
                          ) : (
                            <div className="transport-actions">
                              <button 
                                onClick={() => handleEditClick(company)}
                                className="transport-action-btn transport-action-edit"
                                title="Editar"
                              >
                                <Edit className="transport-action-icon" />
                              </button>
                              <button
                                onClick={() => handleDelete(company.id, company.name)}
                                className="transport-action-btn transport-action-delete"
                                title="Eliminar"
                              >
                                <Trash2 className="transport-action-icon" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal para crear transportadora */}
      {user && (
        <CreateTransportCompanyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateTransportCompany}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}