import { Navigate, Route, Routes } from 'react-router-dom'
import { InvoicesPage } from './features/invoices/InvoicesPage'
import { CataloguePage } from './features/catalogue/CataloguePage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/invoices" replace />} />
      <Route path="/invoices" element={<InvoicesPage />} />
      <Route path="/catalogue" element={<CataloguePage />} />
      <Route path="*" element={<Navigate to="/invoices" replace />} />
    </Routes>
  )
}
