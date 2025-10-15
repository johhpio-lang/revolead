import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: requestingProfile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", requestingUser.id)
      .single();

    if (!requestingProfile || requestingProfile.role !== "superadmin") {
      return new Response(
        JSON.stringify({ error: "Only superadmins can list users" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("id, role, full_name, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) {
      throw profilesError;
    }

    const usersWithDetails = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: authUserData } = await supabaseClient.auth.admin.getUserById(profile.id);

        const { data: companyUsers } = await supabaseClient
          .from("company_users")
          .select(`
            company_id,
            role,
            companies:company_id (
              name
            )
          `)
          .eq("user_id", profile.id);

        return {
          id: profile.id,
          email: authUserData?.user?.email || "N/A",
          profile,
          companies: (companyUsers || []).map((cu: any) => ({
            company_id: cu.company_id,
            company_name: cu.companies?.name || "N/A",
            role: cu.role,
          })),
        };
      })
    );

    return new Response(
      JSON.stringify({ users: usersWithDetails }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in list-users function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});