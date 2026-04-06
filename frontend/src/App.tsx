import { RouterProvider } from 'react-router-dom';
import { router } from './router/index';
import { Toaster } from './components/shared/Toaster';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
