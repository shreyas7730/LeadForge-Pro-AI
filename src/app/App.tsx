import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { ToastViewport } from './components/ui/ToastViewport';

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastViewport />
    </>
  );
}
