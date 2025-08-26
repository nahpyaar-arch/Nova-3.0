import { Link, useLocation } from 'react-router-dom';
import { Home, LineChart, Wallet2, User, BarChart3 } from 'lucide-react';

export default function BottomTabs() {
  const { pathname } = useLocation();
  const atTrade =
    pathname.startsWith('/trade') || pathname.startsWith('/exchange');

  const isActive = (p: string) =>
    p === '/' ? pathname === '/' : pathname.startsWith(p);

  // Only tab items are clickable; the wrapper ignores touches
  const Item: React.FC<{ to: string; active: boolean; label: string; icon: any }> = ({ to, active, label, icon: Icon }) => (
    <Link
      to={to}
      className={`pointer-events-auto flex flex-col items-center justify-center text-xs font-medium ${
        active ? 'text-white' : 'text-gray-400 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5 mb-1" />
      <span>{label}</span>
    </Link>
  );

  return (
    <nav className="fixed bottom-0 inset-x-0 md:hidden z-30 pointer-events-none">
      <div className="relative bg-gray-900/95 backdrop-blur border-t border-gray-800 h-16">
        <div className="grid grid-cols-5 h-full px-2">
          <Item to="/" active={isActive('/')} label="Home" icon={Home} />
          <Item to="/market" active={isActive('/market')} label="Market" icon={LineChart} />

          {/* Center label (hidden on /trade or /exchange) */}
          <div className="flex items-end justify-center pb-1 pointer-events-none">
            {!atTrade && <span className="text-[10px] text-gray-400">Trade</span>}
          </div>

          <Item to="/assets" active={isActive('/assets')} label="Assets" icon={Wallet2} />
          <Item to="/profile" active={isActive('/profile')} label="Profile" icon={User} />
        </div>

        {/* Floating Trade FAB — hidden on /trade & /exchange so it doesn't overlap inputs */}
        {!atTrade && (
          <Link to="/trade" className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-auto">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-xl ring-4 ring-gray-900">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </Link>
        )}
      </div>
      {/* iOS safe-area padding */}
      <div className="h-[env(safe-area-inset-bottom,0px)] bg-gray-900" />
    </nav>
  );
}
