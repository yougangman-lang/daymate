import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider, type Store } from './store/store';
import { ManagerOnly, MemberLayout, StaffLayout } from './components/Layouts';
import { Entry } from './pages/Entry';
import { MemberHome } from './pages/member/Home';
import { BookPage, BookDone } from './pages/member/Book';
import { BodyPage } from './pages/member/Body';
import { BodyReport } from './pages/member/BodyReport';
import { MallPage, ProductPage, PurchaseDemo } from './pages/member/Mall';
import { MePage, HelpPage } from './pages/member/Me';
import { StaffHome } from './pages/staff/Home';
import { ClassesPage, SessionPage } from './pages/staff/Classes';
import { MembersPage, MemberDetail } from './pages/staff/Members';
import { MeasurementsPage, MeasurementDetail } from './pages/staff/Measurements';
import { FeedbackPage } from './pages/staff/Feedback';
import { MallAdmin } from './pages/staff/MallAdmin';
import { InquiriesPage } from './pages/staff/Inquiries';
import { DemoSettings } from './pages/staff/DemoSettings';

export function App({ store }: { store: Store }) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
  return (
    <StoreProvider store={store}>
      <BrowserRouter basename={base}>
        <Routes>
          <Route path="/" element={<Entry />} />
          <Route path="/member" element={<MemberLayout />}>
            <Route index element={<MemberHome />} />
            <Route path="book" element={<BookPage />} />
            <Route path="book/done/:bookingId" element={<BookDone />} />
            <Route path="body" element={<BodyPage />} />
            <Route path="body/report" element={<BodyReport />} />
            <Route path="mall" element={<MallPage />} />
            <Route path="mall/:productId" element={<ProductPage />} />
            <Route path="mall/:productId/purchase" element={<PurchaseDemo />} />
            <Route path="me" element={<MePage />} />
            <Route path="me/help" element={<HelpPage />} />
          </Route>
          <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<StaffHome />} />
            <Route path="classes" element={<ManagerOnly><ClassesPage /></ManagerOnly>} />
            <Route path="classes/:sessionId" element={<SessionPage />} />
            <Route path="members" element={<ManagerOnly><MembersPage /></ManagerOnly>} />
            <Route path="members/:memberId" element={<ManagerOnly><MemberDetail /></ManagerOnly>} />
            <Route path="measurements" element={<ManagerOnly><MeasurementsPage /></ManagerOnly>} />
            <Route path="measurements/:measurementId" element={<ManagerOnly><MeasurementDetail /></ManagerOnly>} />
            <Route path="feedback" element={<FeedbackPage />} />
            <Route path="mall" element={<ManagerOnly><MallAdmin /></ManagerOnly>} />
            <Route path="inquiries" element={<ManagerOnly><InquiriesPage /></ManagerOnly>} />
            <Route path="demo" element={<ManagerOnly><DemoSettings /></ManagerOnly>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
