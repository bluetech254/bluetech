#!/bin/bash

# Apply RLS policies for repair_services table

echo "======================================================================="
echo "🔒 REPAIR SERVICES RLS POLICY SETUP"
echo "======================================================================="
echo ""
echo "The repair_services table doesn't have RLS policies, which is why"
echo "the admin panel can't see the 50 services in the database."
echo ""
echo "📋 OPTION 1: Apply via Supabase Dashboard (RECOMMENDED)"
echo "----------------------------------------------------------------------"
echo "1. Go to: https://supabase.com/dashboard/project/ureebvpesbkbholidlrn/sql/new"
echo "2. Copy and paste the SQL below:"
echo ""
cat /home/m/Documents/GitHub/bluetech/supabase/007_repair_services_rls.sql
echo ""
echo "3. Click 'RUN' button"
echo ""
echo "======================================================================="
echo ""
echo "✅ After applying, refresh the admin panel at http://localhost:3000"
echo "   and navigate to 'Repairs Management' tab."
echo ""
echo "======================================================================="
