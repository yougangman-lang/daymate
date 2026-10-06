import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { EmptyState } from './components/ui';
import { CreateGroup } from './pages/CreateGroup';
import { Explore } from './pages/Explore';
import { GroupDetail } from './pages/GroupDetail';
import { Home } from './pages/Home';
import { Host } from './pages/Host';
import { Invites } from './pages/Invites';
import { MyMate } from './pages/MyMate';
import { Records } from './pages/Records';
import { Result } from './pages/Result';
import { Safety } from './pages/Safety';
import { Start } from './pages/Start';
import { Test } from './pages/Test';
import { StoreProvider } from './store';

// 정적 호스팅에서도 새로고침이 동작하도록 HashRouter를 사용한다.
export function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="explore" element={<Explore />} />
            <Route path="start" element={<Start />} />
            <Route path="test" element={<Test />} />
            <Route path="result" element={<Result />} />
            <Route path="groups/:id" element={<GroupDetail />} />
            <Route path="create" element={<CreateGroup />} />
            <Route path="host" element={<Host />} />
            <Route path="invites" element={<Invites />} />
            <Route path="me" element={<MyMate />} />
            <Route path="safety" element={<Safety />} />
            <Route path="records" element={<Records />} />
            <Route path="*" element={<div className="page narrow"><EmptyState title="페이지를 찾을 수 없어요" /></div>} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
  );
}
