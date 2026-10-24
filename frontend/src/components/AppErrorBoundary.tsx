import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no recuperable en la interfaz:', error, info.componentStack);
  }

  private reload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080808] px-6 text-[#e2e2e2]">
        <section className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111111] p-7 shadow-2xl sm:p-9">
          <TriangleAlert className="mb-5 h-9 w-9 text-[#e8dc00]" aria-hidden="true" />
          <h1 className="font-['Anybody'] text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
            No pudimos mostrar esta pantalla
          </h1>
          <p className="mt-3 max-w-prose text-sm leading-6 text-[#b7b5a8]">
            La aplicación encontró un problema inesperado. Recarga para recuperar la sesión y volver a intentarlo.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={this.reload} className="spartan-btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-xs">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Recargar aplicación
            </button>
            <a href="/" className="spartan-btn-secondary inline-flex items-center px-4 py-2.5 text-xs">
              Ir al inicio
            </a>
          </div>
        </section>
      </main>
    );
  }
}
