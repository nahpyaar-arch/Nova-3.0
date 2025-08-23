/*
  # Nova Crypto Platform Database Schema

  1. New Tables
    - `profiles` - User profile information extending Supabase auth
    - `coins` - Cryptocurrency information and pricing
    - `user_balances` - User cryptocurrency balances
    - `transactions` - All user transactions (deposits, withdrawals, trades, exchanges)
    - `price_history` - Historical price data for charts
    - `admin_settings` - Platform configuration settings

  2. Security
    - Enable RLS on all tables
    - Add policies for user data access
    - Admin-only access for sensitive operations

  3. Real-time Features
    - Price updates subscription
    - Transaction status updates
    - Balance changes
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  name text NOT NULL,
  is_admin boolean DEFAULT false,
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create coins table
CREATE TABLE IF NOT EXISTS coins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text UNIQUE NOT NULL,
  name text NOT NULL,
  price decimal(20,8) NOT NULL DEFAULT 0,
  change_24h decimal(10,4) DEFAULT 0,
  volume decimal(20,2) DEFAULT 0,
  market_cap decimal(20,2) DEFAULT 0,
  is_custom boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_balances table
CREATE TABLE IF NOT EXISTS user_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coin_symbol text NOT NULL,
  balance decimal(20,8) DEFAULT 0,
  locked_balance decimal(20,8) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, coin_symbol)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('deposit', 'withdraw', 'trade', 'exchange')),
  coin_symbol text NOT NULL,
  amount decimal(20,8) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'failed')),
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_symbol text NOT NULL,
  price decimal(20,8) NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert initial coins data
INSERT INTO coins (symbol, name, price, change_24h, volume, market_cap, is_custom) VALUES
('BTC', 'Bitcoin', 43250.00, 2.45, 28500000000, 847000000000, false),
('ETH', 'Ethereum', 2650.00, 1.85, 15200000000, 318000000000, false),
('BNB', 'BNB', 315.50, 0.95, 1800000000, 47200000000, false),
('USDT', 'Tether', 1.00, 0.01, 45000000000, 95000000000, false),
('SOL', 'Solana', 98.75, 3.25, 2100000000, 42800000000, false),
('ADA', 'Cardano', 0.485, -1.25, 580000000, 17200000000, false),
('AVAX', 'Avalanche', 36.80, 2.15, 420000000, 13500000000, false),
('DOT', 'Polkadot', 7.25, -0.85, 180000000, 9200000000, false),
('MATIC', 'Polygon', 0.825, 1.45, 320000000, 7800000000, false),
('MOON', 'Moon Token', 0.0125, 5.75, 15000000, 125000000, true)
ON CONFLICT (symbol) DO NOTHING;

-- Insert admin settings
INSERT INTO admin_settings (key, value) VALUES
('trading_fee', '0.001'),
('withdrawal_fee', '0.005'),
('min_deposit_usdt', '10'),
('min_withdrawal_usdt', '20'),
('platform_status', '{"trading": true, "deposits": true, "withdrawals": true}')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Coins policies (public read, admin write)
CREATE POLICY "Anyone can read coins"
  ON coins
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage coins"
  ON coins
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- User balances policies
CREATE POLICY "Users can read own balances"
  ON user_balances
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own balances"
  ON user_balances
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all balances"
  ON user_balances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Transactions policies
CREATE POLICY "Users can read own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Price history policies (public read, admin write)
CREATE POLICY "Anyone can read price history"
  ON price_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage price history"
  ON price_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admin settings policies
CREATE POLICY "Admins can manage settings"
  ON admin_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create functions for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, is_admin)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    CASE WHEN new.email = 'admin52980@gmail.com' THEN true ELSE false END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update coin prices with history
CREATE OR REPLACE FUNCTION public.update_coin_price(
  coin_sym text,
  new_price decimal(20,8)
)
RETURNS void AS $$
BEGIN
  -- Update coin price
  UPDATE coins 
  SET price = new_price, updated_at = now()
  WHERE symbol = coin_sym;
  
  -- Insert price history
  INSERT INTO price_history (coin_symbol, price)
  VALUES (coin_sym, new_price);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user balance
CREATE OR REPLACE FUNCTION public.get_user_balance(
  user_uuid uuid,
  coin_sym text
)
RETURNS decimal(20,8) AS $$
DECLARE
  user_balance decimal(20,8);
BEGIN
  SELECT balance INTO user_balance
  FROM user_balances
  WHERE user_id = user_uuid AND coin_symbol = coin_sym;
  
  RETURN COALESCE(user_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user balance
CREATE OR REPLACE FUNCTION public.update_user_balance(
  user_uuid uuid,
  coin_sym text,
  amount_change decimal(20,8)
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_balances (user_id, coin_symbol, balance)
  VALUES (user_uuid, coin_sym, amount_change)
  ON CONFLICT (user_id, coin_symbol)
  DO UPDATE SET 
    balance = user_balances.balance + amount_change,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;