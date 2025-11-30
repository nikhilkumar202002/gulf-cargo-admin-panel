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
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-xl w-[92%] max-w-lg p-6">
          <h3 className="text-lg font-semibold text-red-700">Something went wrong</h3>
          <p className="text-sm text-gray-600 mt-2 break-words">
            {String(this.state.error?.message || "Unknown error in modal.")}
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
            >
              Dismiss
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
