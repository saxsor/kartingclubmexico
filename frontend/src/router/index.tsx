import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { NotFound } from '../pages/public/NotFound';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Home } from '../pages/public/Home';
import { Events } from '../pages/public/Events';
import { EventDetail } from '../pages/public/EventDetail';
import { EventRegister } from '../pages/public/EventRegister';
import { EventGrid } from '../pages/public/EventGrid';
import { EventResults } from '../pages/public/EventResults';
import { Championship, ChampionshipDetailPublic } from '../pages/public/Championship';
import { PilotProfile } from '../pages/public/PilotProfile';
import { Login } from '../pages/auth/Login';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { ResetPassword } from '../pages/auth/ResetPassword';
import { Dashboard } from '../pages/admin/Dashboard';
import { PilotList } from '../pages/admin/pilots/PilotList';
import { PilotForm } from '../pages/admin/pilots/PilotForm';
import { EventList } from '../pages/admin/events/EventList';
import { EventForm } from '../pages/admin/events/EventForm';
import { EventHub } from '../pages/admin/events/EventHub';
import { InscriptionManager } from '../pages/admin/inscriptions/InscriptionManager';
import { CashBox } from '../pages/admin/payments/CashBox';
import { CheckInPanel } from '../pages/admin/checkin/CheckInPanel';
import { GridDraw } from '../pages/admin/grid/GridDraw';
import { RacePanel } from '../pages/admin/races/RacePanel';
import { RaceCapture } from '../pages/admin/races/RaceCapture';
import { Classification } from '../pages/admin/classification/Classification';
import { UserManager } from '../pages/admin/users/UserManager';
import { ChampionshipList } from '../pages/admin/championships/ChampionshipList';
import { ChampionshipDetail } from '../pages/admin/championships/ChampionshipDetail';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'eventos', element: <Events /> },
      { path: 'eventos/:slug', element: <EventDetail /> },
      { path: 'eventos/:slug/inscribirse', element: <EventRegister /> },
      { path: 'eventos/:slug/parrilla', element: <EventGrid /> },
      { path: 'eventos/:slug/resultados', element: <EventResults /> },
      { path: 'campeonato', element: <Championship /> },
      { path: 'campeonato/:id', element: <ChampionshipDetailPublic /> },
      { path: 'pilotos/:id', element: <PilotProfile /> },
    ],
  },
  { path: '/login', element: <Login /> },
  { path: '/recuperar-contrasena', element: <ForgotPassword /> },
  { path: '/recuperar-contrasena/:token', element: <ResetPassword /> },
  {
    path: '/app',
    element: <AdminLayout />,
    children: [
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'pilotos', element: <PilotList /> },
      { path: 'pilotos/nuevo', element: <PilotForm /> },
      { path: 'pilotos/:id', element: <PilotForm /> },
      { path: 'eventos', element: <EventList /> },
      { path: 'eventos/nuevo', element: <EventForm /> },
      { path: 'eventos/:slug', element: <EventHub /> },
      { path: 'eventos/:slug/editar', element: <EventForm /> },
      { path: 'eventos/:slug/inscripciones', element: <InscriptionManager /> },
      { path: 'eventos/:slug/caja', element: <CashBox /> },
      { path: 'eventos/:slug/checkin', element: <CheckInPanel /> },
      { path: 'eventos/:slug/parrilla', element: <GridDraw /> },
      { path: 'eventos/:slug/carreras', element: <RacePanel /> },
      { path: 'eventos/:slug/carreras/:raceId', element: <RaceCapture /> },
      { path: 'eventos/:slug/clasificacion', element: <Classification /> },
      { path: 'campeonatos', element: <ChampionshipList /> },
      { path: 'campeonatos/:id', element: <ChampionshipDetail /> },
      { path: 'usuarios', element: <UserManager /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
