import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import Layout from './components/Layout';
import DeployFormPage from './pages/DeployFormPage';
import DeployListPage from './pages/DeployListPage';
import StatusPage from './pages/StatusPage';
import ServerPage from './pages/ServerPage';
import ModelPage from './pages/ModelPage';
import ImagePage from './pages/ImagePage';

const antTheme = {
  token: {
    colorPrimary: '#5B8CFF',
    borderRadius: 12,
    fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, Roboto, sans-serif',
  },
  components: {
    Button: {
      borderRadius: 12,
      controlHeight: 44,
      fontWeight: 500,
    },
    Input: {
      borderRadius: 14,
      controlHeight: 52,
    },
    InputNumber: {
      borderRadius: 14,
      controlHeight: 52,
    },
    Select: {
      borderRadius: 14,
      controlHeight: 52,
    },
    Table: {
      borderRadius: 16,
      headerBg: 'transparent',
      headerColor: '#6B7280',
      headerFontSize: 13,
      borderColor: 'rgba(0,0,0,0.04)',
      rowHoverBg: 'rgba(91,140,255,0.03)',
    },
    Modal: {
      borderRadiusLG: 20,
      borderRadiusSM: 12,
    },
    Card: {
      borderRadiusLG: 24,
    },
    Menu: {
      itemBorderRadius: 12,
      itemSelectedBg: 'rgba(91,140,255,0.10)',
      itemSelectedColor: '#5B8CFF',
      itemHoverBg: 'rgba(91,140,255,0.04)',
      itemMarginInline: 0,
    },
    Form: {
      labelFontSize: 14,
      labelColor: '#111827',
    },
  },
};

function App() {
  return (
    <ConfigProvider theme={{ ...antTheme, algorithm: theme.defaultAlgorithm }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<StatusPage />} />
            <Route path="deploy" element={<DeployFormPage />} />
            <Route path="status" element={<DeployListPage />} />
            <Route path="servers" element={<ServerPage />} />
            <Route path="models" element={<ModelPage />} />
            <Route path="images" element={<ImagePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
