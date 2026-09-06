import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { transporter } from "@/lib/mailer";
import { generateOTP, getExpiry } from "@/lib/otp";
import { otpEmailTemplate } from "@/lib/email-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      action,
      email,
      token,
    }: {
      action: "send" | "verify";
      email: string;
      token?: string;
    } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    /**
     * -------------------------
     * SEND OTP
     * -------------------------
     */
    if (action === "send") {
      const otp = generateOTP();

      // Delete previous OTPs
      await supabase
        .from("email_otps")
        .delete()
        .eq("email", email);

      // Store new OTP
      const { error } = await supabase
        .from("email_otps")
        .insert({
          email,
          otp,
          expires_at: getExpiry(),
          verified: false,
        });

      if (error) {
        console.error(error);

        return NextResponse.json(
          {
            error: error.message,
            details: error,
          },
          {
            status: 500,
          }
        );
      }

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify your Email",
        html: otpEmailTemplate(otp),
      });

      return NextResponse.json({
        success: true,
        message: "OTP sent successfully.",
      });
    }

    /**
     * -------------------------
     * VERIFY OTP
     * -------------------------
     */

    if (action === "verify") {
      if (!token) {
        return NextResponse.json(
          {
            error: "OTP is required.",
          },
          {
            status: 400,
          }
        );
      }

      const { data, error } = await supabase
        .from("email_otps")
        .select("*")
        .eq("email", email)
        .eq("verified", false)
        .single();

      if (error || !data) {
        return NextResponse.json(
          {
            error: "OTP not found.",
          },
          {
            status: 400,
          }
        );
      }

      if (new Date(data.expires_at) < new Date()) {
        await supabase
          .from("email_otps")
          .delete()
          .eq("id", data.id);

        return NextResponse.json(
          {
            error: "OTP expired.",
          },
          {
            status: 400,
          }
        );
      }

      if (data.otp !== token.trim()) {
        return NextResponse.json(
          {
            error: "Invalid OTP.",
          },
          {
            status: 400,
          }
        );
      }

      await supabase
        .from("email_otps")
        .update({
          verified: true,
        })
        .eq("id", data.id);

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      {
        error: "Invalid action.",
      },
      {
        status: 400,
      }
    );
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Internal Server Error.",
      },
      {
        status: 500,
      }
    );
  }
}