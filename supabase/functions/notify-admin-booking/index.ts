import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "BETjBu9ielhfbIVwiiX-4KrxcxkfqhNPMDSeBEGUsytXrurVANe91AApv4eNLMFKYEb1hnnEhoz9oBfU5ZfTF5k";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "T8e7gjpSMlS1cUtgcgIwfaxrmyGVehl3Ix48nvjpAbo";
const VAPID_SUBJECT = "mailto:admin@cuex.club";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action || "notify";

    // ─── 1. Subscribe Device (Admin or Customer) ───────────────────────────
    if (action === "subscribe") {
      const { subscription, user_id, phone, role, user_agent } = body;
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return new Response(JSON.stringify({ error: "Invalid subscription payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let cleanPhone = null;
      if (phone) {
        const digits = String(phone).replace(/\D/g, "");
        cleanPhone = digits.length >= 10 ? digits.slice(-10) : digits;
      }

      const { data, error } = await supabase.from("cuex_push_subscriptions").upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_id: user_id || null,
          phone: cleanPhone,
          role: role || (cleanPhone ? "customer" : "admin"),
          user_agent: user_agent || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      ).select();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, registered: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── 2. Send Automated 1-Hour Booking Reminders ─────────────────────────
    if (action === "send-reminders") {
      const now = new Date();
      const in70Mins = new Date(now.getTime() + 70 * 60 * 1000).toISOString();
      const in50Mins = new Date(now.getTime() + 50 * 60 * 1000).toISOString();

      // Find bookings confirmed that start between 50 and 70 minutes from now
      const { data: upcomingBookings } = await supabase
        .from("cuex_bookings")
        .select("id, booking_reference, customer_name, customer_phone, resource_id, start_at")
        .eq("status", "confirmed")
        .gte("start_at", in50Mins)
        .lte("start_at", in70Mins);

      let sentCount = 0;
      if (upcomingBookings && upcomingBookings.length > 0) {
        for (const bk of upcomingBookings) {
          const digits = bk.customer_phone ? bk.customer_phone.replace(/\D/g, "").slice(-10) : null;
          if (!digits) continue;

          const { data: customerSubs } = await supabase
            .from("cuex_push_subscriptions")
            .select("*")
            .eq("phone", digits);

          if (!customerSubs || customerSubs.length === 0) continue;

          const gameLabel = bk.resource_id === "ps5" ? "PS5 Gaming Station" : bk.resource_id === "pool" ? "Pool Table" : "Snooker Table";
          const payload = JSON.stringify({
            title: `⏰ CueX Match Reminder (${bk.booking_reference})`,
            body: `Hi ${bk.customer_name}! Your ${gameLabel} session starts in 1 hour. Get ready!`,
            icon: "/assets/cuex-logo.png",
            badge: "/assets/cuex-logo.png",
            tag: `cuex-reminder-${bk.id}`,
            url: "/my-bookings",
          });

          for (const sub of customerSubs) {
            try {
              await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { urgency: "high", TTL: 3600 });
              sentCount++;
            } catch (err: any) {
              if (err.statusCode === 404 || err.statusCode === 410) {
                await supabase.from("cuex_push_subscriptions").delete().eq("endpoint", sub.endpoint);
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true, remindersSent: sentCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── 3. Targeted Push Notification (Admin or Specific Customer) ────────
    const target = body.target || "admin"; // 'admin' | 'customer' | 'all'
    const targetPhone = body.phone ? String(body.phone).replace(/\D/g, "").slice(-10) : null;
    const targetUserId = body.user_id || null;

    const title = body.title || "🎱 CueX Notification";
    const message = body.body || "Update regarding your CueX session.";
    const url = body.url || (target === "customer" ? "/my-bookings" : "/admin-app?tab=pending");
    const tag = body.tag || "cuex-" + Date.now();

    let query = supabase.from("cuex_push_subscriptions").select("*");

    if (target === "customer") {
      if (targetPhone && targetUserId) {
        query = query.or(`phone.eq.${targetPhone},user_id.eq.${targetUserId}`);
      } else if (targetPhone) {
        query = query.eq("phone", targetPhone);
      } else if (targetUserId) {
        query = query.eq("user_id", targetUserId);
      } else {
        query = query.eq("role", "customer");
      }
    } else if (target === "admin") {
      query = query.eq("role", "admin");
    }

    const { data: subs, error: subError } = await query;

    if (subError) {
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: `No active push subscriptions for target ${target}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: "/assets/cuex-logo.png",
      badge: "/assets/cuex-logo.png",
      tag,
      url,
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
            TTL: 60 * 60 * 24, // 24 hours
          });
          return { endpoint: sub.endpoint, status: "sent" };
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

    return new Response(JSON.stringify({ success: true, target, sent, failed, total: subs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
