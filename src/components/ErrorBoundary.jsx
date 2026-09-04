import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  // componentDidCatch(error, info) {
  // }
  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.variant === "content") {
      return (
        <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
          <div>
            <h2 className="text-lg font-semibold text-rose-800">This page could not be loaded</h2>
            <p className="mt-2 text-sm text-rose-700">Please retry to load the page again.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-xl w-[92%] max-w-lg p-6">
          <h3 className="text-lg font-semibold text-red-700">Something went wrong while loading this page</h3>
          <p className="text-sm text-gray-600 mt-2">Please try again.</p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
            >
              Retry
            </button>
            {this.props.onClose && (
              <button
                onClick={this.props.onClose}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
