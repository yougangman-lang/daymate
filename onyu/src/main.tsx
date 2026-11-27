import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/pages.css';
import './styles/facility.css';
import './styles/coaches.css';
import { App } from './App';
import { createStore } from './store/store';

const store = createStore();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
);
