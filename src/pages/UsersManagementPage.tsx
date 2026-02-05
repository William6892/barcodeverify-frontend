import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Edit, UserCheck, UserX, 
  Shield, AlertCircle, CheckCircle2, Eye, EyeOff, X,
} from 'lucide-react';
import './css/UsersManagement.css';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'User' | 'Admin' | 'Scanner';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  totalScans?: number;
  totalProductsScanned?: number;
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'User' as 'User' | 'Admin' | 'Scanner'
  });

  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
    role: 'User' as 'User' | 'Admin' | 'Scanner'
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.username.trim()) {
      newErrors.username = 'El usuario es obligatorio';
    } else if (formData.username.length < 3) {
      newErrors.username = 'El usuario debe tener al menos 3 caracteres';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!showEditModal && !formData.password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (!showEditModal && formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEditForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!editFormData.username.trim()) {
      newErrors.username = 'El usuario es obligatorio';
    } else if (editFormData.username.length < 3) {
      newErrors.username = 'El usuario debe tener al menos 3 caracteres';
    }

    if (!editFormData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      newErrors.email = 'El email no es válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No autenticado');

      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error('Sesión expirada');
        if (res.status === 403) throw new Error('Sin permisos');
        throw new Error('Error al cargar usuarios');
      }

      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error al crear usuario');
      }

      setSuccess('✅ Usuario creado exitosamente');
      setShowCreateModal(false);
      resetForm();
      await fetchUsers();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || !validateEditForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: editFormData.username.trim(),
          email: editFormData.email.trim(),
          role: editFormData.role
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al actualizar');
      }

      setSuccess('✅ Usuario actualizado exitosamente');
      setShowEditModal(false);
      resetForm();
      await fetchUsers();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (!res.ok) throw new Error('Error al cambiar estado');

      setSuccess(`✅ Usuario ${!currentStatus ? 'activado' : 'desactivado'}`);
      await fetchUsers();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({ username: '', email: '', password: '', role: 'User' });
    setEditFormData({ username: '', email: '', role: 'User' });
    setErrors({});
    setSelectedUser(null);
    setShowPassword(false);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      username: user.username,
      email: user.email,
      role: user.role
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || 
                       (statusFilter === 'active' && u.isActive) ||
                       (statusFilter === 'inactive' && !u.isActive);
    return matchSearch && matchRole && matchStatus;
  });

  const getBadgeClass = (role: string) => {
    switch(role) {
      case 'Admin': return 'users-badge-admin';
      case 'Scanner': return 'users-badge-scanner';
      default: return 'users-badge-user';
    }
  };

  if (loading) {
    return (
      <div className="users-loading">
        <div className="users-loading-spinner"></div>
        <p className="users-loading-text">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="users-container">
      {/* Header */}
      <div className="users-header">
        <div className="users-header-main">
          <h1 className="users-header-title">Gestión de Usuarios</h1>
          <p className="users-header-subtitle">Administra los usuarios del sistema</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="users-header-button"
        >
          <UserPlus className="users-header-button-icon" />
          Nuevo Usuario
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="users-alert users-alert-error">
          <AlertCircle className="users-alert-icon" />
          <div className="users-alert-content">
            <p>{error}</p>
          </div>
          <button onClick={() => setError(null)} className="users-alert-close">
            <X className="users-alert-close-icon" />
          </button>
        </div>
      )}

      {success && (
        <div className="users-alert users-alert-success">
          <CheckCircle2 className="users-alert-icon" />
          <div className="users-alert-content">
            <p>{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="users-alert-close">
            <X className="users-alert-close-icon" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="users-filters">
        <div className="users-filters-grid">
          <div className="users-search-container">
            <Search className="users-search-icon" />
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="users-search-input"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="users-select"
          >
            <option value="all">Todos los roles</option>
            <option value="Admin">Administradores</option>
            <option value="User">Usuarios</option>
            <option value="Scanner">Escáner</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="users-select"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="users-table-container">
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead className="users-table-header">
              <tr>
                <th className="users-table-header-cell">Usuario</th>
                <th className="users-table-header-cell">Rol</th>
                <th className="users-table-header-cell">Estado</th>
                <th className="users-table-header-cell">Último Acceso</th>
                <th className="users-table-header-cell">Actividad</th>
                <th className="users-table-header-cell">Acciones</th>
              </tr>
            </thead>
            <tbody className="users-table-body">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="users-empty-state">
                    <Users className="users-empty-icon" />
                    <p className="users-empty-text">No se encontraron usuarios</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="users-table-row">
                    <td className="users-table-cell users-table-cell-user">
                      <div className="users-user-avatar">
                        <Users className="users-user-avatar-icon" />
                      </div>
                      <div className="users-user-info">
                        <div className="users-user-name">{user.username}</div>
                        <div className="users-user-email">{user.email}</div>
                      </div>
                    </td>
                    <td className="users-table-cell">
                      <span className={`users-badge ${getBadgeClass(user.role)}`}>
                        {user.role === 'Admin' && <Shield className="users-badge-icon" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="users-table-cell">
                      <span className={`users-badge ${user.isActive ? 'users-badge-active' : 'users-badge-inactive'}`}>
                        {user.isActive ? <UserCheck className="users-badge-icon" /> : <UserX className="users-badge-icon" />}
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="users-table-cell">
                      <div className="users-last-login">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Nunca'}
                      </div>
                    </td>
                    <td className="users-table-cell">
                      <div className="users-activity">
                        <div className="users-activity-count">{user.totalScans || 0} escaneos</div>
                        <div className="users-activity-label">{user.totalProductsScanned || 0} productos</div>
                      </div>
                    </td>
                    <td className="users-table-cell">
                      <div className="users-actions">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="users-action-button users-action-button-edit"
                          title="Editar usuario"
                        >
                          <Edit className="users-action-button-icon" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user.id, user.isActive)}
                          className={`users-action-button users-action-button-toggle ${
                            user.isActive ? 'users-action-button-active' : 'users-action-button-inactive'
                          }`}
                          title={user.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                        >
                          {user.isActive ? <UserX className="users-action-button-icon" /> : <UserCheck className="users-action-button-icon" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="users-modal-overlay">
          <div className="users-modal">
            <h3 className="users-modal-title">Crear Nuevo Usuario</h3>
            
            <div className="users-form-group">
              <label className="users-form-label">Usuario *</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className={`users-form-input ${errors.username ? 'users-form-input-error' : ''}`}
                placeholder="john_doe"
              />
              {errors.username && <p className="users-form-error">{errors.username}</p>}
            </div>

            <div className="users-form-group">
              <label className="users-form-label">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className={`users-form-input ${errors.email ? 'users-form-input-error' : ''}`}
                placeholder="usuario@ejemplo.com"
              />
              {errors.email && <p className="users-form-error">{errors.email}</p>}
            </div>

            <div className="users-form-group">
              <label className="users-form-label">Contraseña *</label>
              <div className="users-password-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className={`users-form-input ${errors.password ? 'users-form-input-error' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="users-password-toggle"
                >
                  {showPassword ? <EyeOff className="users-password-toggle-icon" /> : <Eye className="users-password-toggle-icon" />}
                </button>
              </div>
              {errors.password && <p className="users-form-error">{errors.password}</p>}
              <p className="users-form-help">Mínimo 6 caracteres</p>
            </div>

            <div className="users-form-group">
              <label className="users-form-label">Rol *</label>
              <select
                name="role"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                className="users-form-input"
              >
                <option value="User">Usuario</option>
                <option value="Admin">Administrador</option>
                <option value="Scanner">Escáner</option>
              </select>
            </div>

            <div className="users-modal-actions">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="users-modal-button users-modal-button-cancel"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateUser}
                className="users-modal-button users-modal-button-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="users-modal-overlay">
          <div className="users-modal">
            <h3 className="users-modal-title">Editar Usuario</h3>            
            
            <div className="users-form-group">
              <label className="users-form-label">Usuario *</label>
              <input
                type="text"
                name="username"
                value={editFormData.username}
                onChange={handleEditFormChange}
                className={`users-form-input ${errors.username ? 'users-form-input-error' : ''}`}
                placeholder="Nombre de usuario"
              />
              {errors.username && <p className="users-form-error">{errors.username}</p>}
            </div>

            <div className="users-form-group">
              <label className="users-form-label">Email *</label>
              <input
                type="email"
                name="email"
                value={editFormData.email}
                onChange={handleEditFormChange}
                className={`users-form-input ${errors.email ? 'users-form-input-error' : ''}`}
                placeholder="correo@ejemplo.com"
              />
              {errors.email && <p className="users-form-error">{errors.email}</p>}
            </div>

            <div className="users-form-group">
              <label className="users-form-label">Rol *</label>
              <select
                name="role"
                value={editFormData.role}
                onChange={handleEditFormChange}
                className="users-form-input"
              >
                <option value="User">Usuario</option>
                <option value="Admin">Administrador</option>
                <option value="Scanner">Escáner</option>
              </select>
            </div>

            <div className="users-form-group">
              <label className="users-form-label">Información Adicional</label>
              <div className="users-info-grid">
                <div className="users-info-item">
                  <span className="users-info-label">Estado:</span>
                  <span className={`users-info-value ${selectedUser.isActive ? 'users-info-active' : 'users-info-inactive'}`}>
                    {selectedUser.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="users-info-item">                  
                  <span className="users-info-value">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {selectedUser.lastLogin && (
                  <div className="users-info-item">
                    <span className="users-info-label">Último acceso:</span>
                    <span className="users-info-value">
                      {new Date(selectedUser.lastLogin).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="users-modal-actions">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="users-modal-button users-modal-button-cancel"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateUser}
                className="users-modal-button users-modal-button-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}