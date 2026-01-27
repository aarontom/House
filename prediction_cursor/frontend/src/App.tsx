import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './hooks/useTheme';
import { UserProvider } from './hooks/useUser';
import Layout from './components/Layout';
import Home from './pages/Home';
import MarketPage from './pages/Market';
import CreateMarket from './pages/CreateMarket';
import ProofPage from './pages/Proof';
import Portfolio from './pages/Portfolio';
import MyMarkets from './pages/MyMarkets';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <UserProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="market/:id" element={<MarketPage />} />
                <Route path="create" element={<CreateMarket />} />
                <Route path="proof/:marketId" element={<ProofPage />} />
                <Route path="portfolio" element={<Portfolio />} />
                <Route path="my-markets" element={<MyMarkets />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </UserProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
