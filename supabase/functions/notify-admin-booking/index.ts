import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY =
  Deno.env.get("VAPID_PUBLIC_KEY") ||
  "BETjBu9ielhfbIVwiiX-4KrxcxkfqhNPMDSeBEGUsytXrurVANe91AApv4eNLMFKYEb1hnnEhoz9oBfU5ZfTF5k";
const VAPID_PRIVATE_KEY =
  Deno.env.get("VAPID_PRIVATE_KEY") ||
  "T8e7gjpSMlS1cUtgcgIwfaxrmyGVehl3Ix48nvjpAbo";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@cuex.club";
const WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") || "";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  const allowedOriginsEnv = Deno.env.get("ALLOWED_ORIGINS");
  let allowOrigin = "*";

  if (allowedOriginsEnv) {
    const list = allowedOriginsEnv.split(",").map((s) => s.trim().toLowerCase());
    if (origin && list.includes(origin.toLowerCase())) {
      allowOrigin = origin;
    } else {
      allowOrigin = list[0] || "*";
    }
  } else if (origin) {
    allowOrigin = origin;
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// URL sanitization: must be same-site relative path starting with single '/'
function sanitizeUrl(url: unknown, defaultUrl: string): string {
  if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  return defaultUrl;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Caller authorization check
    const secretHeader = req.headers.get("x-webhook-secret");
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    let isAuthorizedWebhook = false;
    let isAuthorizedAdmin = false;
    let authUserId: string | null = null;

    if (WEBHOOK_SECRET && (secretHeader === WEBHOOK_SECRET || token === WEBHOOK_SECRET)) {
      isAuthorizedWebhook = true;
    }

    if (token && !isAuthorizedWebhook) {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (!userError && userData?.user) {
          authUserId = userData.user.id;
          // Verify admin privilege in cuex_admins or profiles
          const { data: adminRecord } = await supabase
            .from("cuex_admins")
            .select("id")
            .eq("id", authUserId)
            .maybeSingle();

          if (adminRecord) {
            isAuthorizedAdmin = true;
          } else {
            const { data: profileRecord } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", authUserId)
              .maybeSingle();
            if (profileRecord?.role === "admin") {
              isAuthorizedAdmin = true;
            }
          }
        }
      } catch {
        // invalid token
      }
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "notify";

    // ─── 1. Subscribe Device ────────────────────────────────────────────────
    if (action === "subscribe") {
      const { subscription, phone, role, user_agent } = body;
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return new Response(JSON.stringify({ error: "Invalid subscription payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If claiming admin role, MUST be an authenticated admin or webhook
      let assignedRole = "customer";
      if (role === "admin") {
        if (isAuthorizedAdmin || isAuthorizedWebhook) {
          assignedRole = "admin";
        } else {
          assignedRole = "customer";
        }
      }

      let cleanPhone = null;
      if (phone) {
        const digits = String(phone).replace(/\D/g, "");
        cleanPhone = digits.length >= 10 ? digits.slice(-10) : digits;
      }

      const { error: upsertErr } = await supabase.from("cuex_push_subscriptions").upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_id: authUserId,
          phone: cleanPhone,
          role: assignedRole,
          user_agent: typeof user_agent === "string" ? user_agent.slice(0, 500) : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

      if (upsertErr) {
        return new Response(JSON.stringify({ error: "Subscription registration failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, role: assignedRole }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Protected Actions require Webhook or Admin Authorization ─────────
    if (!isAuthorizedWebhook && !isAuthorizedAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── 2. Send Automated 1-Hour Booking Reminders ─────────────────────────
    if (action === "send-reminders") {
      const now = new Date();
      const in75Mins = new Date(now.getTime() + 75 * 60 * 1000).toISOString();
      const in45Mins = new Date(now.getTime() + 45 * 60 * 1000).toISOString();

      // Find confirmed bookings starting within 45 to 75 minutes where reminder has not been sent yet
      const { data: upcomingBookings } = await supabase
        .from("cuex_bookings")
        .select("id, booking_reference, customer_name, customer_phone, resource_id, start_at, reminder_sent_at")
        .eq("status", "confirmed")
        .is("reminder_sent_at", null)
        .gte("start_at", in45Mins)
        .lte("start_at", in75Mins);

      let sentCount = 0;
      if (upcomingBookings && upcomingBookings.length > 0) {
        for (const bk of upcomingBookings) {
          const digits = bk.customer_phone ? bk.customer_phone.replace(/\D/g, "").slice(-10) : null;
          if (!digits) continue;

          const { data: customerSubs } = await supabase
            .from("cuex_push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("phone", digits);

          if (!customerSubs || customerSubs.length === 0) continue;

          const gameLabel =
            bk.resource_id === "ps5"
              ? "PS5 Gaming Station"
              : bk.resource_id === "pool"
              ? "Pool Table"
              : "Snooker Table";

          const payload = JSON.stringify({
            title: `⏰ CueX Match Reminder (${bk.booking_reference})`,
            body: `Hi ${bk.customer_name}! Your ${gameLabel} session starts in 1 hour. Get ready!`,
            icon: "/assets/cuex-logo.png",
            badge: "/assets/cuex-logo.png",
            tag: `cuex-reminder-${bk.id}`,
            url: "/my-bookings",
            role: "customer",
          });

          let bookingPushSuccess = false;
          for (const sub of customerSubs) {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload,
                { urgency: "high", TTL: 3600 }
              );
              sentCount++;
              bookingPushSuccess = true;
            } catch (err: any) {
              if (err.statusCode === 404 || err.statusCode === 410) {
                await supabase.from("cuex_push_subscriptions").delete().eq("endpoint", sub.endpoint);
              }
            }
          }

          // Mark reminder_sent_at so it NEVER sends twice
          if (bookingPushSuccess) {
            await supabase
              .from("cuex_bookings")
              .update({ reminder_sent_at: new Date().toISOString() })
              .eq("id", bk.id);
          }
        }
      }

      return new Response(JSON.stringify({ success: true, remindersSent: sentCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── 3. Targeted Push Notification (Admin or Customer) ────────────────
    const target = body.target === "customer" ? "customer" : "admin";
    const targetPhone = body.phone ? String(body.phone).replace(/\D/g, "").slice(-10) : null;

    const title = String(body.title || "🎱 CueX Notification").slice(0, 120);
    const message = String(body.body || "Update regarding your CueX session.").slice(0, 500);
    const safeUrl = sanitizeUrl(
      body.url,
      target === "customer" ? "/my-bookings" : "/admin-app?tab=pending"
    );
    const tag = String(body.tag || "cuex-" + Date.now()).slice(0, 60);

    let query = supabase.from("cuex_push_subscriptions").select("endpoint, p256dh, auth");

    if (target === "customer") {
      if (targetPhone) {
        query = query.eq("phone", targetPhone);
      } else {
        query = query.eq("role", "customer");
      }
    } else {
      query = query.eq("role", "admin");
    }

    const { data: subs, error: subError } = await query;
    if (subError) {
      return new Response(JSON.stringify({ error: "Failed to retrieve subscriptions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: `No active subscriptions for ${target}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: "/assets/cuex-logo.png",
      badge: "/assets/cuex-logo.png",
      tag,
      url: safeUrl,
      role: target,
      timestamp: Date.now(),
    });

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload, {
            urgency: "high",
            TTL: 60 * 60 * 24,
          });
          return { status: "sent" };
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from("cuex_push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
          throw err;
        }
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ success: true, target, sent, failed, total: subs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
