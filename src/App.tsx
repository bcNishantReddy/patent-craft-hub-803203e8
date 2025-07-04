
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/hooks/useAuth';
import MainLayoutWrapper from '@/components/layout/MainLayoutWrapper';

// Pages
import Index from '@/pages/Index';
import Dashboard from '@/pages/Dashboard';
import Patents from '@/pages/Patents';
import PatentDetails from '@/pages/PatentDetails';
import AddEditPatent from '@/pages/AddEditPatent';
import Employees from '@/pages/Employees';
import AddEditEmployee from '@/pages/AddEditEmployee';
import Approvals from '@/pages/Approvals';
import Drafts from '@/pages/Drafts';
import Filings from '@/pages/Filings';
import ClientDashboard from '@/pages/ClientDashboard';
import BulkUpload from '@/pages/BulkUpload';
import Sheets from '@/pages/Sheets';
import EmployeeDashboard from '@/pages/EmployeeDashboard';
import Finance from '@/pages/Finance';
import Accounts from '@/pages/Accounts';
import NotFound from '@/pages/NotFound';

import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <MainLayoutWrapper>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/company-dashboard" element={<Dashboard />} />
              <Route path="/patents" element={<Patents />} />
              <Route path="/patents/:id" element={<PatentDetails />} />
              <Route path="/patents/add" element={<AddEditPatent />} />
              <Route path="/patents/edit/:id" element={<AddEditPatent />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/employees/add" element={<AddEditEmployee />} />
              <Route path="/employees/edit/:id" element={<AddEditEmployee />} />
              <Route path="/employee/:employeeName" element={<EmployeeDashboard />} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/drafts" element={<Drafts />} />
              <Route path="/filings" element={<Filings />} />
              <Route path="/clients" element={<ClientDashboard />} />
              <Route path="/bulk-upload" element={<BulkUpload />} />
              <Route path="/sheets" element={<Sheets />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MainLayoutWrapper>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
