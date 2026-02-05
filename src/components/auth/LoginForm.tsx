import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { LogIn, AlertCircle, Eye, EyeOff, ShieldAlert, WifiOff } from 'lucide-react';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validaciones con feedback visual
    if (!username.trim()) {
      setError('Por favor ingresa tu usuario');
      document.getElementById('username')?.focus();
      return;
    }
    
    if (!password.trim()) {
      setError('Por favor ingresa tu contraseña');
      document.getElementById('password')?.focus();
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 Login con:', username);
      
      const response = await fetch('http://localhost:5034/api/Auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        // ERRORES específicos con iconos
        let errorTitle = 'Error';
        let errorMessage = 'Error del servidor';
        let errorIcon = '❌';
        
        if (response.status === 401) {
          errorTitle = 'Credenciales incorrectas';
          errorMessage = 'El usuario o contraseña son incorrectos. Verifica e intenta de nuevo.';
          errorIcon = '🔐';
        } else if (response.status === 400) {
          errorTitle = 'Datos inválidos';
          errorMessage = data?.message || 'Los datos enviados son inválidos.';
          errorIcon = '📝';
        } else if (response.status === 403) {
          errorTitle = 'Acceso denegado';
          errorMessage = 'Tu cuenta está desactivada. Contacta al administrador.';
          errorIcon = '🚫';
        } else if (response.status === 404) {
          errorTitle = 'Usuario no encontrado';
          errorMessage = 'El usuario no existe en el sistema.';
          errorIcon = '👤';
        } else if (response.status === 500) {
          errorTitle = 'Error del servidor';
          errorMessage = 'Problema interno del servidor. Intenta más tarde.';
          errorIcon = '⚙️';
        }
        
        // Mostrar alert personalizado
        alert(`${errorIcon} ${errorTitle}\n\n${errorMessage}`);
        
        setError(errorMessage);
        setPassword('');
        return;
      }
      
      // ÉXITO - Validar estructura
      if (!data.token || !data.user) {
        alert('⚠️ Respuesta inválida\n\nEl servidor devolvió una respuesta incompleta.');
        setError('Respuesta del servidor inválida');
        return;
      }
      
      // Guardar datos
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Actualizar contexto
      login(data.user, data.token);
      
      // Mensaje de éxito personalizado
      const roleIcon = data.user.role === 'Admin' ? '👑' : '👤';
      const roleText = data.user.role === 'Admin' ? 'Administrador' : 'Usuario';
      
      alert(`✅ ¡Bienvenido ${data.user.username}!\n\nRol: ${roleIcon} ${roleText}\n\nRedirigiendo...`);
      
      // Redirigir después de 500ms para que se vea el alert
      setTimeout(() => {
        if (data.user.role === 'Admin') {
          navigate('/admin');
        } else {
          navigate('/scanner');
        }
      }, 500);
      
    } catch (err) {
      console.error('❌ Error de conexión:', err);
      
      // Determinar tipo de error
      let errorTitle = 'Error de conexión';
      let errorMessage = 'No se pudo conectar al servidor. Verifica:\n\n• Tu conexión a internet\n• Que el servidor esté ejecutándose\n• La URL del servidor';
      let errorIcon = '🌐';
      
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        errorTitle = 'Servidor no disponible';
        errorMessage = 'No se puede contactar al servidor en http://localhost:5034\n\nAsegúrate de que el backend esté corriendo.';
        errorIcon = '🔌';
      }
      
      alert(`${errorIcon} ${errorTitle}\n\n${errorMessage}`);
      
      setError(errorTitle);
      setPassword('');
      
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mensaje de error persistente */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg animate-fadeIn shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Error de autenticación</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Campo usuario */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
          Usuario
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (error) setError('');
          }}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-100"
          placeholder="Ingresa tu usuario asignado"
          disabled={loading}
          autoComplete="username"
          autoFocus
        />
      </div>

      {/* Campo contraseña */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-100 pr-12"
            placeholder="Ingresa tu contraseña asignada"
            disabled={loading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none disabled:opacity-50"
            disabled={loading}
            tabIndex={-1}
            title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Botón de login */}
      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-md hover:shadow-lg"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Verificando credenciales...</span>
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              <span>Iniciar Sesión</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}