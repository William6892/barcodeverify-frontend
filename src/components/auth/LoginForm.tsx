import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api'; // ✅ Importar authService
import { LogIn, Eye, EyeOff, ShieldAlert } from 'lucide-react';

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
      console.log('🔐 Login con username:', username);
      
      // ✅ USAR authService EN LUGAR DE fetch DIRECTO
      const response = await authService.login({
        username: username,
        password: password
      });
      
      console.log('✅ Login exitoso:', response);
      
      // Validar estructura de respuesta
      if (!response.token || !response.user) {
        console.error('❌ Respuesta incompleta:', response);
        setError('Respuesta del servidor inválida');
        alert('⚠️ Respuesta inválida del servidor');
        return;
      }
      
      // Guardar datos
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Actualizar contexto de autenticación
      login(response.user, response.token);
      
      // Mensaje de éxito
      const roleIcon = response.user.role === 'Admin' ? '👑' : 
                      response.user.role === 'Scanner' ? '📱' : '👤';
      const roleText = response.user.role === 'Admin' ? 'Administrador' : 
                      response.user.role === 'Scanner' ? 'Escáner' : 'Usuario';
      
      console.log(`✅ ¡Bienvenido ${response.user.username}! Rol: ${roleText}`);
      
      // Redirigir inmediatamente (sin alert)
      if (response.user.role === 'Admin') {
        navigate('/admin');
      } else {
        navigate('/scanner');
      }
      
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      
      // Manejar errores de authService
      let errorMessage = 'Error al iniciar sesión';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          errorMessage = 'Credenciales incorrectas. Verifica tu usuario y contraseña.';
        } else if (status === 400) {
          errorMessage = data?.message || 'Datos de entrada inválidos';
        } else if (status === 404) {
          errorMessage = 'Endpoint no encontrado. Contacta al administrador.';
        } else if (status === 500) {
          errorMessage = 'Error interno del servidor. Intenta más tarde.';
        } else {
          errorMessage = data?.message || `Error ${status}`;
        }
      } else if (error.request) {
        errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
      } else {
        errorMessage = error.message || 'Error desconocido';
      }
      
      setError(errorMessage);
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
          placeholder="Ingresa tu nombre de usuario"
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
            placeholder="Ingresa tu contraseña"
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

      {/* Información de prueba */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <p className="font-semibold">💡 Credenciales de prueba:</p>
        <p>Usuario: <span className="font-mono">angie</span></p>
        <p>Contraseña: <span className="font-mono">angie123</span></p>
        <p className="mt-1 text-xs">Rol: Usuario</p>
      </div>
    </form>
  );
}