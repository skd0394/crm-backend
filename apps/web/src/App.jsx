import { Navigate, Route, Routes } from 'react-router-dom'
import { useSession } from './session.js'
import Login from './pages/Login.jsx'
import Enquire from './pages/Enquire.jsx'
import Dashboard from './pages/Dashboard.jsx'

export default function App() {
  const { session } = useSession()
  return (
    <Routes>
      <Route path="/enquire" element={<Enquire />} />
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={session ? <Dashboard /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
