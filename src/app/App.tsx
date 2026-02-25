import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SessionProvider } from './context/SessionContext';
import { Layout } from './shared/components/Layout';
import { LibraryPage } from './pages/library/LibraryPage';
import { UploadPage } from './pages/upload/UploadPage';
// import { DiscoveryPage } from './pages/discovery/DiscoveryPage';
import { ValidatePage } from './pages/validate/validatePage';
import { FundamentalPage } from './pages/fundamental/FundamentalPage';
import { AnalysisPage } from './pages/analysis/AnalysisPage';
import { ArchitecturePage } from './pages/architecture/ArchitecturePage';
import { RequirementsPage } from './pages/requirements/RequirementsPage';
import { SubsystemsPage } from './pages/subsystems/SubsystemsPage';
import { CompliancePage } from './pages/compliance/CompliancePage';
import { ReviewPage } from './pages/review/ReviewPage';
import { CompletedPage } from './pages/completed/CompletedPage';

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/upload" element={<Layout showStageIndicator={true}><UploadPage /></Layout>} />
          {/* <Route path="/discovery" element={<Layout showStageIndicator={true}><DiscoveryPage /></Layout>} /> */}
          <Route path="/fundamental" element={<Layout showStageIndicator={true}><FundamentalPage /></Layout>} />
          <Route path="/analysis" element={<Layout showStageIndicator={true}><AnalysisPage /></Layout>} />
           <Route path="/validate" element={<Layout showStageIndicator={true}><ValidatePage /></Layout>} />
          <Route path="/architecture" element={<Layout showStageIndicator={true}><ArchitecturePage /></Layout>} />
          <Route path="/requirements" element={<Layout showStageIndicator={true}><RequirementsPage /></Layout>} />
          <Route path="/subsystems" element={<Layout showStageIndicator={true}><SubsystemsPage /></Layout>} />
          <Route path="/compliance" element={<Layout showStageIndicator={true}><CompliancePage /></Layout>} />
          <Route path="/review" element={<Layout><ReviewPage /></Layout>} />
          <Route path="/completed" element={<CompletedPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}
