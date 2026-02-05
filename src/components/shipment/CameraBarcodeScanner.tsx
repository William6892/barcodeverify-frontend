import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Smartphone, AlertCircle, X, RefreshCw, Maximize2, Minimize2, Scan, CheckCircle, Barcode } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface CameraBarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose?: () => void;
}

// SOLO FORMATOS DE CÓDIGOS DE BARRAS (sin QR codes)
const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,       // Código 128 (muy común)
  Html5QrcodeSupportedFormats.CODE_39,        // Código 39
  Html5QrcodeSupportedFormats.CODE_93,        // Código 93
  Html5QrcodeSupportedFormats.EAN_13,         // EAN-13 (productos)
  Html5QrcodeSupportedFormats.EAN_8,          // EAN-8
  Html5QrcodeSupportedFormats.UPC_A,          // UPC-A (productos USA)
  Html5QrcodeSupportedFormats.UPC_E,          // UPC-E
  Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION, // Extensión UPC/EAN
  Html5QrcodeSupportedFormats.CODABAR,        // Codabar
  Html5QrcodeSupportedFormats.ITF,            // ITF (Interleaved 2 of 5)
  Html5QrcodeSupportedFormats.RSS_14,         // RSS 14
  Html5QrcodeSupportedFormats.RSS_EXPANDED,   // RSS Expandido
  Html5QrcodeSupportedFormats.PDF_417,        // PDF417 (2D pero tipo barcode)
];

// Mapeo de formatos a nombres legibles
const FORMAT_NAMES: Record<Html5QrcodeSupportedFormats, string> = {
  [Html5QrcodeSupportedFormats.CODE_128]: "Code 128",
  [Html5QrcodeSupportedFormats.CODE_39]: "Code 39",
  [Html5QrcodeSupportedFormats.CODE_93]: "Code 93",
  [Html5QrcodeSupportedFormats.EAN_13]: "EAN-13",
  [Html5QrcodeSupportedFormats.EAN_8]: "EAN-8",
  [Html5QrcodeSupportedFormats.UPC_A]: "UPC-A",
  [Html5QrcodeSupportedFormats.UPC_E]: "UPC-E",
  [Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION]: "UPC/EAN Extension",
  [Html5QrcodeSupportedFormats.CODABAR]: "Codabar",
  [Html5QrcodeSupportedFormats.ITF]: "ITF",
  [Html5QrcodeSupportedFormats.RSS_14]: "RSS 14",
  [Html5QrcodeSupportedFormats.RSS_EXPANDED]: "RSS Expanded",
  [Html5QrcodeSupportedFormats.PDF_417]: "PDF417",
  // QR codes (mantenemos para completitud)
  [Html5QrcodeSupportedFormats.QR_CODE]: "QR Code",
  [Html5QrcodeSupportedFormats.AZTEC]: "Aztec",
  [Html5QrcodeSupportedFormats.DATA_MATRIX]: "Data Matrix",
  [Html5QrcodeSupportedFormats.MAXICODE]: "MaxiCode",
};

export default function CameraBarcodeScanner({ onScan, onClose }: CameraBarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [scanAttempts, setScanAttempts] = useState(0);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const [scannerReady, setScannerReady] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerAreaRef = useRef<HTMLDivElement>(null);
  const scannerIdRef = useRef(`barcode-scanner-${Date.now()}`);

  // Obtener cámaras disponibles
  const getCameras = useCallback(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setAvailableCameras(devices);
        console.log(`📷 Cámaras encontradas: ${devices.length}`);
        return devices;
      }
      throw new Error('No se encontraron cámaras');
    } catch (err) {
      console.error('Error obteniendo cámaras:', err);
      setError('No se pudieron detectar las cámaras disponibles');
      return [];
    }
  }, []);

  // Inicializar escáner SOLO para códigos de barras
  const initScanner = useCallback(async () => {
    try {
      // Esperar a que el elemento del DOM esté listo
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!scannerAreaRef.current) {
        console.error('❌ Elemento del escáner no encontrado en el DOM');
        throw new Error('Elemento del escáner no está disponible');
      }

      setIsLoading(true);
      setError(null);
      setScanAttempts(0);

      // Limpiar escáner anterior si existe
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (e) {
          console.log('Limpiando escáner anterior...', e);
        }
      }

      // Obtener cámaras
      const cameras = await getCameras();
      if (cameras.length === 0) {
        throw new Error('No se encontraron cámaras en este dispositivo.');
      }

      // Configuración OPTIMIZADA para códigos de barras
      const config = {
        fps: 15, // Mayor FPS para mejor detección
        qrbox: { 
          width: 300, // Área más ancha para códigos de barras largos
          height: 120 // Menor altura para códigos de barras
        },
        aspectRatio: 1.7777778, // 16:9 estándar
        formatsToSupport: BARCODE_FORMATS,
        rememberLastUsedCamera: false,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 1,
        focusMode: "continuous", // Para mantener el foco
        focusDistance: 0, // Distancia de enfoque normal
        useBarCodeDetectorIfSupported: true, // Usar API nativa si está disponible
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      // Crear nueva instancia del escáner
      scannerRef.current = new Html5Qrcode(scannerIdRef.current);
      
      // Configurar nombres de formatos para mostrar
      const formatNames = BARCODE_FORMATS.map(format => FORMAT_NAMES[format]);
      setActiveFormats(formatNames);
      console.log('🔍 Formatos activos:', formatNames);

      // Seleccionar cámara
      let cameraId = cameras[0].id;
      if (cameras.length > 1) {
        // Priorizar cámara trasera si existe
        const backCamera = cameras.find(cam => 
          cam.label.toLowerCase().includes('back') || 
          cam.label.toLowerCase().includes('posterior') ||
          cam.label.toLowerCase().includes('rear') ||
          cam.label.toLowerCase().includes('environment')
        );
        cameraId = backCamera?.id || cameras[currentCameraIndex % cameras.length].id;
      }

      console.log('🎥 Iniciando escáner de códigos de barras...');
      console.log('📸 Cámara seleccionada:', cameraId);

      // Callback para escaneo exitoso
      const onScanSuccess = (decodedText: string, decodedResult: any) => {
        setScanAttempts(prev => prev + 1);
        
        // Solo procesar si es diferente al último escaneo
        if (lastScanned !== decodedText) {
          console.log('✅ CÓDIGO DETECTADO:', {
            texto: decodedText,
            formato: decodedResult?.result?.format || 'desconocido',
            raw: decodedResult
          });
          
          setLastScanned(decodedText);
          onScan(decodedText);
          
          // Feedback visual breve
          if (scannerRef.current) {
            scannerRef.current.pause();
            setTimeout(() => {
              if (scannerRef.current?.isScanning) {
                scannerRef.current.resume();
              }
            }, 800);
          }
        }
      };

      // Callback para errores (silencioso)
      const onScanFailure = (error: string) => {
        setScanAttempts(prev => prev + 1);
        // Solo loguear errores no triviales
        if (!error.includes('NotFound') && !error.includes('No QR code')) {
          console.log('📷 Escaneando... Intentos:', scanAttempts + 1, 'Error:', error);
        }
      };

      // Iniciar escaneo
      await scannerRef.current.start(
        cameraId,
        config,
        onScanSuccess,
        onScanFailure
      );

      setIsScanning(true);
      setIsLoading(false);
      setScannerReady(true);
      console.log('🚀 Escáner iniciado correctamente');

    } catch (err: any) {
      console.error('❌ ERROR iniciando escáner:', err);
      setIsLoading(false);
      setScannerReady(false);
      
      let errorMessage = 'Error al iniciar el escáner de códigos de barras';
      
      if (err.message?.includes('HTML Element with id=')) {
        errorMessage = 'Error técnico: El escáner no se pudo inicializar. Por favor, recarga la página.';
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Permiso de cámara denegado. Por favor permite el acceso a la cámara en la configuración de tu navegador.';
      } else if (err.name === 'NotFoundError' || err.message?.includes('No camera found')) {
        errorMessage = 'No se encontró ninguna cámara en este dispositivo.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Tu navegador no soporta acceso a cámara. Usa Chrome, Firefox o Edge.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'La cámara está siendo usada por otra aplicación. Cierra otras apps que usen la cámara.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  }, [getCameras, lastScanned, scanAttempts, currentCameraIndex]);

  // Detener escáner
  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        console.log('🛑 Escáner detenido');
      }
    } catch (err) {
      console.error('Error deteniendo escáner:', err);
    }
    
    setIsScanning(false);
    setScannerReady(false);
  }, []);

  // Inicializar después de que el componente esté montado
  useEffect(() => {
    // Pequeño delay para asegurar que el DOM esté renderizado
    const timer = setTimeout(() => {
      if (scannerAreaRef.current) {
        initScanner();
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [currentCameraIndex]);

  // Efecto para manejar cambios en el contenedor
  useEffect(() => {
    if (scannerAreaRef.current && !scannerReady && !isLoading) {
      console.log('🔄 Contenedor listo, inicializando escáner...');
      initScanner();
    }
  }, [scannerReady, isLoading]);

  // Cambiar cámara
  const switchCamera = useCallback(() => {
    if (availableCameras.length < 2) return;
    
    const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
    setCurrentCameraIndex(nextIndex);
    console.log(`🔄 Cambiando a cámara ${nextIndex + 1} de ${availableCameras.length}`);
  }, [availableCameras.length, currentCameraIndex]);

  // Reiniciar escáner
  const restartScanner = useCallback(() => {
    stopScanner();
    setTimeout(() => {
      if (scannerAreaRef.current) {
        initScanner();
      }
    }, 500);
  }, [stopScanner, initScanner]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Cerrar
  const handleClose = useCallback(() => {
    stopScanner();
    if (onClose) onClose();
  }, [stopScanner, onClose]);

  // Manejar cambios de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Reiniciar escáner al cambiar fullscreen
      if (scannerAreaRef.current) {
        setTimeout(() => restartScanner(), 200);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [restartScanner]);

  // Consejos para mejor escaneo
  const scanningTips = [
    "Acerca el código a 15-30 cm",
    "Buena iluminación",
    "Mantén estable",
    "Código completo visible"
  ];

  return (
    <div 
      ref={containerRef}
      className={`bg-gray-900 rounded-lg overflow-hidden shadow-2xl ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
    >
      {/* Header */}
      <div className="bg-gray-800 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Barcode className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-bold text-white">Escáner de Códigos de Barras</h3>
            <p className="text-sm text-gray-400">
              {availableCameras.length > 0 
                ? `Cámara ${currentCameraIndex + 1} de ${availableCameras.length}` 
                : 'Buscando cámaras...'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {availableCameras.length > 1 && (
            <button
              onClick={switchCamera}
              disabled={isLoading}
              className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
              title="Cambiar cámara"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={restartScanner}
            disabled={isLoading}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
            title="Reiniciar escáner"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          
          <button
            onClick={handleClose}
            className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Área de escaneo */}
      <div className="relative bg-black aspect-video min-h-[400px]">
        {/* Loading */}
        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white font-medium text-lg">Iniciando escáner...</p>
              <p className="text-gray-400 mt-2">Preparando cámara y configuraciones</p>
            </div>
          </div>
        )}
        
        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/95 z-10">
            <div className="text-center max-w-md bg-gray-800 rounded-xl p-6 border border-red-500/30">
              <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Error del Escáner</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">{error}</p>
              <div className="space-y-3">
                <button
                  onClick={restartScanner}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                >
                  Reintentar
                </button>
                <button
                  onClick={handleClose}
                  className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
                >
                  Cerrar
                </button>
              </div>
              <div className="mt-6 p-3 bg-gray-900 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Solución de problemas:</p>
                <ul className="text-xs text-gray-500 text-left space-y-1">
                  <li>• Asegúrate de dar permisos de cámara</li>
                  <li>• Usa Chrome, Firefox o Edge</li>
                  <li>• Verifica que la cámara no esté en uso por otra app</li>
                  <li>• Si estás en HTTPS local, usa http://localhost:3001</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Contenedor del escáner - con ID fijo */}
        <div 
          ref={scannerAreaRef}
          id={scannerIdRef.current}
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        />
        
        {/* Overlay de escaneo */}
        {!error && !isLoading && isScanning && (
          <>
            {/* Marco para códigos de barras (horizontal) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-80 h-32">
                {/* Marco horizontal */}
                <div className="absolute inset-0 border-3 border-green-500 rounded-lg shadow-2xl">
                  {/* Esquinas */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-green-400 -translate-x-1 -translate-y-1"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-green-400 translate-x-1 -translate-y-1"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-green-400 -translate-x-1 translate-y-1"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-green-400 translate-x-1 translate-y-1"></div>
                  
                  {/* Línea de escaneo horizontal */}
                  <div className="absolute left-0 right-0 top-1/2 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse"></div>
                </div>
                
                {/* Texto guía */}
                <div className="absolute -bottom-10 left-0 right-0 text-center">
                  <p className="text-green-400 text-sm font-medium bg-black/50 px-3 py-1 rounded-full inline-block">
                    Alinee el código de barras horizontalmente
                  </p>
                </div>
              </div>
            </div>
            
            {/* Consejos */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
              <div className="flex gap-2 flex-wrap justify-center">
                {scanningTips.map((tip, index) => (
                  <div 
                    key={index}
                    className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-gray-300 border border-gray-700"
                  >
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer con información */}
      <div className="bg-gray-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Código escaneado */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {lastScanned ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">Último código:</span>
                </>
              ) : (
                <>
                  <Scan className="w-5 h-5 text-blue-400 animate-pulse" />
                  <span className="text-gray-400">Listo para escanear</span>
                </>
              )}
            </div>
            
            {lastScanned && (
              <div className="bg-gray-900 rounded-lg p-3">
                <code className="text-white font-mono text-sm break-all">
                  {lastScanned}
                </code>
              </div>
            )}
          </div>
          
          {/* Información técnica */}
          <div className="space-y-2">
            <div className="text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Estado:</span>
                <span className={`font-medium ${isScanning ? 'text-green-400' : 'text-yellow-400'}`}>
                  {isScanning ? 'Escaneando...' : 'Inicializando'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Intentos:</span>
                <span className="text-white">{scanAttempts}</span>
              </div>
              <div className="mt-2 text-xs">
                <span className="text-gray-500">Formatos soportados:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {activeFormats.slice(0, 3).map((format, i) => (
                    <span key={i} className="bg-gray-700 px-2 py-1 rounded text-xs">
                      {format}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}