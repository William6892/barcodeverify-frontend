import { useEffect, useRef, useCallback, useState } from 'react';
import { Keyboard, Zap, Info, Package, AlertCircle } from 'lucide-react';

// Interface simplificada para datos de escaneo
export interface ScanData {
  shipmentId: number;
  barcode: string;
  quantity?: number;
  name?: string;
  category?: string;
}

interface BarcodeScannerProps {
  onScan: (scanData: ScanData) => void;
  shipmentId?: number; // Hacer opcional para cuando no hay envío seleccionado
}

export default function BarcodeScanner({ onScan, shipmentId }: BarcodeScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const barcodeBuffer = useRef('');
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastScannedRef = useRef('');
  const lastScannedTimeRef = useRef(0);
  
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const notification = document.createElement('div');
    let bgColor = 'bg-green-500';
    if (type === 'error') bgColor = 'bg-red-500';
    if (type === 'warning') bgColor = 'bg-yellow-500';
    
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 2500);
  }, []);

  const playBeepSound = useCallback((type: 'success' | 'error' = 'success') => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = type === 'success' ? 800 : 400;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (err) {
      console.log('Audio no disponible');
    }
  }, []);

  // Función simplificada de procesamiento
  const processBarcode = useCallback(async (barcode: string) => {
    const cleanBarcode = barcode.replace(/\r|\n|\t/g, '').trim();
    
    if (cleanBarcode.length === 0) return;

    if (!shipmentId) {
      showNotification('⚠️ Primero selecciona un envío', 'warning');
      return;
    }

    const now = Date.now();
    if (lastScannedRef.current === cleanBarcode && now - lastScannedTimeRef.current < 2000) {
      showNotification('⚠️ Código ya escaneado recientemente', 'warning');
      return;
    }

    lastScannedRef.current = cleanBarcode;
    lastScannedTimeRef.current = now;
    setIsScanning(true);

    try {
      const scanData: ScanData = {
        shipmentId,
        barcode: cleanBarcode,
        quantity: 1,
        name: `Producto ${cleanBarcode.substring(0, 8)}`,
        category: 'General'
      };

      playBeepSound('success');
      showNotification(`✓ ${scanData.name}`, 'success');
      
      onScan(scanData);
      
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      playBeepSound('error');
      showNotification('❌ Error al procesar código', 'error');
    } finally {
      setIsScanning(false);
    }
  }, [shipmentId, onScan, playBeepSound, showNotification]);

  // Manejar entrada del lector USB
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target && target !== document.body && target !== inputRef.current) {
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
      }

      if (event.key.length === 1 && /[0-9a-zA-Z-_]/.test(event.key)) {
        event.preventDefault();
        barcodeBuffer.current += event.key;
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          if (barcodeBuffer.current.length >= 4) {
            processBarcode(barcodeBuffer.current);
          }
          barcodeBuffer.current = '';
        }, 100);
      }
      
      if (event.key === 'Enter' && barcodeBuffer.current.length >= 4) {
        event.preventDefault();
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        processBarcode(barcodeBuffer.current);
        barcodeBuffer.current = '';
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [processBarcode]);

  // Auto-focus al montar
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Manejo de entrada manual
  const handleManualInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = e.currentTarget.value.trim();
      if (value.length >= 4) {
        processBarcode(value);
        e.currentTarget.value = '';
      } else if (value.length > 0) {
        showNotification('El código debe tener al menos 4 caracteres', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Área principal de escaneo */}
      <div className="p-6 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
          <Keyboard className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-xl font-bold text-blue-900 mb-2">
          Modo Lector USB
          {shipmentId && <span className="text-blue-600 ml-2">• Envío #{shipmentId}</span>}
        </h3>
        <p className="text-gray-700 mb-6">
          Apunta tu lector de códigos de barras al producto y presiona el gatillo
        </p>
        
        {/* Indicador visual del buffer */}
        <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Zap className={`w-5 h-5 ${isScanning ? 'text-yellow-500 animate-pulse' : 'text-blue-500'}`} />
            <p className="text-sm font-medium text-gray-600">
              {isScanning ? 'Procesando...' : 'Listo para escanear'}
            </p>
          </div>
          <div className="font-mono text-2xl bg-gray-50 p-4 rounded border min-h-[60px] flex items-center justify-center">
            {barcodeBuffer.current || (
              <span className="text-gray-400">Esperando código de barras...</span>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {barcodeBuffer.current ? `${barcodeBuffer.current.length} caracteres capturados` : 'Apunta y escanea'}
          </div>
        </div>
        
        {/* Input manual alternativo */}
        <div className="max-w-md mx-auto">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Ingreso manual (opcional):
          </label>
          <input
            ref={inputRef}
            type="text"
            onKeyDown={handleManualInput}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-lg font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            placeholder="Escribe y presiona Enter"
          />
          <p className="text-xs text-gray-500 mt-2">
            Mínimo 4 caracteres • Presiona Enter para confirmar
          </p>
        </div>
      </div>
      
      {/* Información y estado */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Escaneo Activo</h2>
              <p className="text-blue-100 text-sm">
                {shipmentId ? `Envío ID: #${shipmentId}` : 'Sin envío seleccionado'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-200">Estado:</div>
            <div className="text-lg font-bold">{isScanning ? 'Escaneando...' : 'Listo'}</div>
          </div>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900 mb-3">📋 Instrucciones de uso:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">1.</span>
                <span>Asegúrate de tener un envío seleccionado</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">2.</span>
                <span>Conecta tu lector USB y apunta al código de barras</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">3.</span>
                <span>Escucha el "beep" de confirmación</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">4.</span>
                <span>Alternativamente, escribe el código manualmente y presiona Enter</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tips de solución de problemas */}
      {!shipmentId && (
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 mb-2">
                Acción requerida:
              </h3>
              <p className="text-sm text-amber-800">
                Para comenzar a escanear, primero selecciona o crea un envío desde el menú superior.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}