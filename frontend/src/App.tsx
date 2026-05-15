import Scene from './components/three/Scene';
import RackSwitcher from './components/ui/RackSwitcher';
import LibraryPanel from './components/ui/LibraryPanel';
import ModeToolbar from './components/ui/ModeToolbar';
import DetailPanel from './components/ui/DetailPanel';

export default function App() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-rack-bg">
      <Scene />
      <RackSwitcher />
      <LibraryPanel />
      <ModeToolbar />
      <DetailPanel />
    </div>
  );
}
