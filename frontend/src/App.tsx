import { Component, ReactNode } from 'react';
import Scene from './components/three/Scene';
import RackSwitcher from './components/ui/RackSwitcher';
import LibraryPanel from './components/ui/LibraryPanel';
import ModeToolbar from './components/ui/ModeToolbar';
import DetailPanel from './components/ui/DetailPanel';
import ManagementPanel from './components/ui/ManagementPanel';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="w-screen h-screen bg-black flex flex-col items-center justify-center p-8 text-red-400 font-mono text-sm">
          <div className="text-red-300 text-lg mb-4">App Crash</div>
          <div className="bg-gray-900 border border-red-800 rounded p-4 max-w-2xl w-full whitespace-pre-wrap break-all">
            {(this.state.error as Error).message}
          </div>
          <div className="mt-4 text-gray-500 text-xs whitespace-pre-wrap break-all max-w-2xl">
            {(this.state.error as Error).stack}
          </div>
          <button
            className="mt-6 px-4 py-2 bg-red-900 text-red-200 rounded hover:bg-red-800"
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <div className="relative w-screen h-screen overflow-hidden bg-rack-bg">
        <Scene />
        <RackSwitcher />
        <LibraryPanel />
        <ModeToolbar />
        <DetailPanel />
        <ManagementPanel />
      </div>
    </AppErrorBoundary>
  );
}
