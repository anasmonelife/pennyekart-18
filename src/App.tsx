import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PushNavigationHandler from "@/components/PushNavigationHandler";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { LiteModeProvider, useLiteMode } from "@/hooks/useLiteMode";
import { DisplaySettingsProvider } from "@/hooks/useDisplaySettings";
import Index from "./pages/Index";
import LiteIndex from "./pages/LiteIndex";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import SplashScreen from "./components/SplashScreen";
import ProtectedRoute from "./components/admin/ProtectedRoute";
import ProtectedPartnerRoute from "./components/ProtectedPartnerRoute";
import Dashboard from "./pages/admin/Dashboard";
import UsersPage from "./pages/admin/UsersPage";
import RolesPage from "./pages/admin/RolesPage";
import ProductsPage from "./pages/admin/ProductsPage";
import CombosPage from "./pages/admin/CombosPage";
import OrdersPage from "./pages/admin/OrdersPage";
import BannersPage from "./pages/admin/BannersPage";
import CategoriesPage from "./pages/admin/CategoriesPage";
import ServicesPage from "./pages/admin/ServicesPage";
import UtilityServicesPage from "./pages/admin/UtilityServicesPage";
import LocationsPage from "./pages/admin/LocationsPage";
import GodownsPage from "./pages/admin/GodownsPage";
import PurchasePage from "./pages/admin/PurchasePage";
import DeliveryManagementPage from "./pages/admin/DeliveryManagementPage";
import SellingPartnersPage from "./pages/admin/SellingPartnersPage";
import OffersPage from "./pages/admin/OffersPage";
import PennyServices from "./pages/PennyServices";
import UtilityServicesPublic from "./pages/UtilityServices";
import ServiceDetail from "./pages/ServiceDetail";
import PennyCarbs from "./pages/PennyCarbs";
import AppSettingsPage from "./pages/admin/AppSettingsPage";
import StorageConfigPage from "./pages/admin/StorageConfigPage";
import StockControlPage from "./pages/admin/StockControlPage";
import ReportsPage from "./pages/admin/ReportsPage";
import SalesReportPage from "./pages/admin/SalesReportPage";
import WalletManagementPage from "./pages/admin/WalletManagementPage";
import PennyPrimePage from "./pages/admin/PennyPrimePage";
import PlatformMarginPage from "./pages/admin/PlatformMarginPage";
import ChatbotSettingsPage from "./pages/admin/ChatbotSettingsPage";
import NotificationsPage from "./pages/admin/NotificationsPage";
import PushNotificationsPage from "./pages/admin/PushNotificationsPage";
import ScratchRewardsPage from "./pages/admin/ScratchRewardsPage";
import CommunitiesPage from "./pages/admin/CommunitiesPage";
import NotificationPopup from "./components/NotificationPopup";
import PennyPrimePublic from "./pages/PennyPrime";
import DeliveryStaffSignup from "./pages/delivery-staff/Signup";
import DeliveryStaffLogin from "./pages/delivery-staff/Login";
import DeliveryStaffForgotPassword from "./pages/delivery-staff/ForgotPasswordPage";
import DeliveryStaffDashboard from "./pages/delivery-staff/Dashboard";
import SellingPartnerSignup from "./pages/selling-partner/Signup";
import SellingPartnerLogin from "./pages/selling-partner/Login";
import SellingPartnerForgotPassword from "./pages/selling-partner/ForgotPasswordPage";
import SellingPartnerDashboardRouter from "./pages/selling-partner/DashboardRouter";
import UtilityPartnerSignup from "./pages/utility-partner/Signup";
import UtilityPartnerLogin from "./pages/utility-partner/Login";
import UtilityPartnerDashboard from "./pages/utility-partner/Dashboard";
import CustomerSignup from "./pages/customer/Signup";
import CustomerLogin from "./pages/customer/Login";
import ProductDetail from "./pages/customer/ProductDetail";
import FlashSaleDetail from "./pages/customer/FlashSaleDetail";
import Cart from "./pages/customer/Cart";
import CustomerProfile from "./pages/customer/Profile";
import VerifyAccountLink from "./pages/customer/VerifyAccountLink";
import CustomerWallet from "./pages/customer/Wallet";
import PlayVideos from "./pages/customer/PlayVideos";
import CategoryProducts from "./pages/customer/CategoryProducts";
import ChatBot from "./components/ChatBot";
import PullToRefresh from "./components/PullToRefresh";
import PermissionPrompt from "./components/PermissionPrompt";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import Terms from "./pages/legal/Terms";
import DeleteAccount from "./pages/legal/DeleteAccount";
import DeletionRequestsPage from "./pages/admin/DeletionRequestsPage";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { liteMode } = useLiteMode();

  return (
    <Routes>
      <Route path="/" element={liteMode ? <LiteIndex /> : <Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute requirePermission="read_users"><UsersPage /></ProtectedRoute>} />
      <Route path="/admin/roles" element={<ProtectedRoute requireSuperAdmin><RolesPage /></ProtectedRoute>} />
      <Route path="/admin/products" element={<ProtectedRoute requirePermission="read_products"><ProductsPage /></ProtectedRoute>} />
      <Route path="/admin/combos" element={<ProtectedRoute requirePermission="read_products"><CombosPage /></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute requirePermission="read_orders"><OrdersPage /></ProtectedRoute>} />
      <Route path="/admin/banners" element={<ProtectedRoute requirePermission="read_banners"><BannersPage /></ProtectedRoute>} />
      <Route path="/admin/categories" element={<ProtectedRoute requirePermission="read_categories"><CategoriesPage /></ProtectedRoute>} />
      <Route path="/admin/services" element={<ProtectedRoute requirePermission="read_services"><ServicesPage /></ProtectedRoute>} />
      <Route path="/admin/utility-services" element={<ProtectedRoute requirePermission="read_services"><UtilityServicesPage /></ProtectedRoute>} />
      <Route path="/admin/locations" element={<ProtectedRoute requirePermission="read_locations"><LocationsPage /></ProtectedRoute>} />
      <Route path="/admin/godowns" element={<ProtectedRoute requirePermission="read_godowns"><GodownsPage /></ProtectedRoute>} />
      <Route path="/admin/purchase" element={<ProtectedRoute requirePermission="create_stock"><PurchasePage /></ProtectedRoute>} />
      <Route path="/admin/delivery" element={<ProtectedRoute requirePermission="read_delivery_staff"><DeliveryManagementPage /></ProtectedRoute>} />
      <Route path="/admin/sellers" element={<ProtectedRoute requirePermission="read_selling_partners"><SellingPartnersPage /></ProtectedRoute>} />
      <Route path="/admin/offers" element={<ProtectedRoute requirePermission="read_offers"><OffersPage /></ProtectedRoute>} />
      <Route path="/services" element={<PennyServices />} />
      <Route path="/services/:id" element={<ServiceDetail />} />
      <Route path="/utility-services" element={<UtilityServicesPublic />} />
      <Route path="/pennycarbs" element={<PennyCarbs />} />
      <Route path="/admin/stock-control" element={<ProtectedRoute requirePermission="read_stock"><StockControlPage /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute requirePermission="read_settings"><AppSettingsPage /></ProtectedRoute>} />
      <Route path="/admin/storage" element={<ProtectedRoute requireSuperAdmin><StorageConfigPage /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute requirePermission="read_reports"><ReportsPage /></ProtectedRoute>} />
      <Route path="/admin/sales-report" element={<ProtectedRoute requirePermission="read_reports"><SalesReportPage /></ProtectedRoute>} />
      <Route path="/admin/wallets" element={<ProtectedRoute requirePermission="read_wallets"><WalletManagementPage /></ProtectedRoute>} />
      <Route path="/admin/penny-prime" element={<ProtectedRoute requirePermission="read_penny_prime"><PennyPrimePage /></ProtectedRoute>} />
      <Route path="/admin/platform-margin" element={<ProtectedRoute requirePermission="read_products"><PlatformMarginPage /></ProtectedRoute>} />
      <Route path="/admin/chatbot" element={<ProtectedRoute requirePermission="read_settings"><ChatbotSettingsPage /></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute requirePermission="read_settings"><NotificationsPage /></ProtectedRoute>} />
      <Route path="/admin/push-notifications" element={<ProtectedRoute requirePermission="read_settings"><PushNotificationsPage /></ProtectedRoute>} />
      <Route path="/admin/scratch-rewards" element={<ProtectedRoute requirePermission="read_settings"><ScratchRewardsPage /></ProtectedRoute>} />
      <Route path="/admin/communities" element={<ProtectedRoute requirePermission="read_users"><CommunitiesPage /></ProtectedRoute>} />
      <Route path="/penny-prime" element={<PennyPrimePublic />} />

      {/* Delivery Staff */}
      <Route path="/delivery-staff/signup" element={<DeliveryStaffSignup />} />
      <Route path="/delivery-staff/login" element={<DeliveryStaffLogin />} />
      <Route path="/delivery-staff/forgot-password" element={<DeliveryStaffForgotPassword />} />
      <Route path="/delivery-staff/dashboard" element={
        <ProtectedPartnerRoute userType="delivery_staff" loginPath="/delivery-staff/login">
          <DeliveryStaffDashboard />
        </ProtectedPartnerRoute>
      } />

      {/* Customer */}
      <Route path="/play" element={<PlayVideos />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/category/:name" element={<CategoryProducts />} />
      <Route path="/flash-sale/:id" element={<FlashSaleDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/customer/signup" element={<CustomerSignup />} />
      <Route path="/customer/login" element={<CustomerLogin />} />
      <Route path="/customer/profile" element={<CustomerProfile />} />
      <Route path="/customer/verify" element={<VerifyAccountLink />} />
      <Route path="/customer/wallet" element={<CustomerWallet />} />

      {/* Selling Partner */}
      <Route path="/selling-partner/signup" element={<SellingPartnerSignup />} />
      <Route path="/selling-partner/login" element={<SellingPartnerLogin />} />
      <Route path="/selling-partner/forgot-password" element={<SellingPartnerForgotPassword />} />
      <Route path="/selling-partner/dashboard" element={
        <ProtectedPartnerRoute userType="selling_partner" loginPath="/selling-partner/login">
          <SellingPartnerDashboardRouter />
        </ProtectedPartnerRoute>
      } />

      {/* Utility Service Partner */}
      <Route path="/utility-partner/signup" element={<UtilityPartnerSignup />} />
      <Route path="/utility-partner/login" element={<UtilityPartnerLogin />} />
      <Route path="/utility-partner/dashboard" element={
        <ProtectedPartnerRoute userType="selling_partner" loginPath="/utility-partner/login">
          <UtilityPartnerDashboard />
        </ProtectedPartnerRoute>
      } />

      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/delete-account" element={<DeleteAccount />} />
      <Route path="/admin/deletion-requests" element={<ProtectedRoute requirePermission="read_users"><DeletionRequestsPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const hideSplash = useCallback(() => setShowSplash(false), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DisplaySettingsProvider>
        <LiteModeProvider>
          <Toaster />
          <Sonner />
          {showSplash && <SplashScreen onComplete={hideSplash} />}
          <BrowserRouter>
            <AuthProvider>
              <CartProvider>
                <AppRoutes />
                <PushNavigationHandler />
                <ChatBot />
                <NotificationPopup />
                <PullToRefresh />
                <PermissionPrompt />
              </CartProvider>
            </AuthProvider>
          </BrowserRouter>
        </LiteModeProvider>
        </DisplaySettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
