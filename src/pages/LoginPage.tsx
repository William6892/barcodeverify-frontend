import LoginForm from '../components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Barcode Shipping System</h1>
          <p className="mt-2 text-gray-600">Inicia sesión para continuar</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}