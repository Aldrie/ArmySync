import './globals.css';
import EditorPage from '../pages/editor/editor-page';
import HomePage from '../pages/home/home-page';
import { useAppStore } from '../stores/app-store';

export default function App() {
  const route = useAppStore((s) => s.route);

  if (route === 'editor') {
    return <EditorPage />;
  }

  return <HomePage />;
}
