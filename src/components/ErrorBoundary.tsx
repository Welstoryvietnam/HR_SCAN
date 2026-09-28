import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 shadow-xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Đã xảy ra sự cố hiển thị</h2>
              <p className="text-xs text-slate-500 mt-1">
                Hệ thống đã ghi nhận lỗi giao diện. Vui lòng bấm nút bên dưới để khôi phục trạng thái.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 bg-slate-50 rounded-lg text-left border border-slate-200 text-xs font-mono text-rose-600 break-all max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Khôi phục &amp; Tải lại trang</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
