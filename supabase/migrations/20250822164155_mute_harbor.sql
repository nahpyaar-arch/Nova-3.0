@@ .. @@
 -- Coins policies (public read, admin write)
 CREATE POLICY "Anyone can read coins"
   ON coins
   FOR SELECT
-  TO authenticated
+  TO public
   USING (is_active = true);