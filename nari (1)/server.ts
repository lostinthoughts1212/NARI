/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NARI Women's Safety App — Backend Express API Server
 * Full-Stack integration for Chain-of-Custody Escalation Engine & Crisis Gateway
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { createServer as createViteServer } from 'vite';
import { globalEscalationEngine } from './src/lib/escalationEngine';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// ── Supabase Auth Setup (Passwordless Email OTP) ─────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';

const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ── Fallback In-Memory OTP Store ──────────────────────────────────────────────
interface OtpRecord { otp: string; expiresAt: number; attempts: number }
const otpStore = new Map<string, OtpRecord>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Nodemailer transporter ────────────────────────────────────────────────────
// Returns { transporter, isTestMode } — isTestMode=true means Ethereal fallback.
async function createTransporter(): Promise<{ transporter: nodemailer.Transporter; isTestMode: boolean }> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST ?? 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);

  if (user && pass) {
    const isGmail = host.includes('gmail') || user.endsWith('@gmail.com');
    const transportOpts = isGmail
      ? {
          service: 'gmail',
          auth: { user, pass },
        }
      : {
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        };

    return {
      transporter: nodemailer.createTransport(transportOpts),
      isTestMode: false,
    };
  }
  // Fallback: Ethereal fake SMTP (logs email content to console, no real sending)
  const testAccount = await nodemailer.createTestAccount();
  console.log('\n⚠  SMTP not configured — using Ethereal test account.');
  console.log(`   Preview emails at: https://ethereal.email`);
  console.log(`   Ethereal user: ${testAccount.user} / pass: ${testAccount.pass}\n`);
  return {
    transporter: nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    }),
    isTestMode: true,
  };
}

async function startServer() {
  const app = express();
  // Read from PORT env var so we don't clash with other services (e.g. Multica on 3000).
  const PORT = parseInt(process.env.PORT ?? '5173', 10);

  app.use(express.json());

  // API HEALTH CHECK
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'NARI Chain-of-Custody Engine', timestamp: new Date().toISOString() });
  });

  // ── EMAIL OTP AUTHENTICATION ─────────────────────────────────────────────────

  // POST /api/auth/send-otp  { email }
  app.post('/api/auth/send-otp', async (req, res) => {
    try {
      const email: string = (req.body.email ?? '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      // ── Supabase Passwordless Email OTP (only if real SMTP is NOT configured) ──
      const hasRealSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
      if (supabase && !hasRealSmtp) {
        try {
          const { error } = await supabase.auth.signInWithOtp({ email });
          if (!error) {
            return res.json({ success: true, message: 'Verification code sent to your email via Supabase.' });
          }
        } catch (supabaseErr: any) {
          // Fallback to Nodemailer SMTP below
        }
      }

      // Throttle: max 1 request per 60 seconds
      const existing = otpStore.get(email);
      if (existing && existing.expiresAt - 4 * 60 * 1000 > Date.now()) {
        return res.status(429).json({ error: 'Please wait 60 seconds before requesting another code.' });
      }

      const otp = generateOtp();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      otpStore.set(email, { otp, expiresAt, attempts: 0 });
      console.log(`\n🔐  GENERATED VERIFICATION CODE for ${email}: ${otp}\n`);

      // Auto-clean expired OTPs
      setTimeout(() => { if (otpStore.get(email)?.expiresAt === expiresAt) otpStore.delete(email); }, 5 * 60 * 1000);

      try {
        const { transporter, isTestMode } = await createTransporter();
        const info = await transporter.sendMail({
          from: `"NARI Safety Platform" <${process.env.SMTP_USER ?? 'nari@example.com'}>`,
          to: email,
          subject: '🔐 Your NARI Verification Code',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#F9DBBD;padding:32px;border-radius:16px;border:1px solid #f0c39c;">
              <div style="text-align:center;margin-bottom:24px;">
                <div style="display:inline-block;background:#A53860;color:white;font-size:11px;font-family:monospace;padding:6px 16px;border-radius:999px;letter-spacing:2px;font-weight:bold;">
                  NARI AUTH GATEWAY
                </div>
                <h2 style="color:#450920;font-size:22px;margin-top:16px;font-style:italic;">Your Verification Code</h2>
              </div>
              <div style="background:white;border:1px solid #f0c39c;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <p style="color:#450920;font-size:13px;margin-bottom:12px;font-weight:600;">Enter this code in the NARI app:</p>
                <div style="font-size:40px;font-weight:900;letter-spacing:10px;color:#A53860;font-family:monospace;">${otp}</div>
                <p style="color:#A53860;font-size:11px;margin-top:12px;">⏱ Valid for 5 minutes only</p>
              </div>
              <p style="color:#450920;font-size:11px;text-align:center;opacity:0.7;">
                If you did not request this, ignore this email.<br>
                Your account remains secure.
              </p>
              <p style="text-align:center;font-size:9px;color:#450920;font-family:monospace;letter-spacing:2px;margin-top:20px;opacity:0.5;">
                NARI CRYP-SHIELD PROTOCOL • ECC-256 ENABLED
              </p>
            </div>`,
        });

        if (!isTestMode) {
          console.log(`📧  REAL EMAIL DELIVERED via Gmail SMTP to ${email} (MessageId: ${info.messageId})`);
        } else {
          const preview = nodemailer.getTestMessageUrl(info);
          if (preview) console.log(`📧  OTP email preview: ${preview}`);
        }
      } catch (mailErr: any) {
        console.warn('⚠ Email send error:', mailErr.message, '— use code printed in console above.');
      }

      return res.json({
        success: true,
        message: hasRealSmtp
          ? `Verification code sent to ${email}. Check your inbox!`
          : `Verification code sent. (Use code: ${otp})`,
        ...(hasRealSmtp ? {} : { otp })
      });
    } catch (err: any) {
      console.error('[send-otp]', err.message);
      return res.status(500).json({ error: err.message || 'Failed to send email. Please try again.' });
    }
  });

  // POST /api/auth/verify-otp  { email, otp }
  app.post('/api/auth/verify-otp', async (req, res) => {
    const email: string = (req.body.email ?? '').trim().toLowerCase();
    const otp: string   = (req.body.otp ?? '').trim();

    // ── Supabase OTP Verification ──
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'email',
        });
        if (!error && data?.user) {
          return res.json({ success: true, email, user: data.user, message: 'Email verified successfully.' });
        }
      } catch (supabaseErr: any) {
        console.warn('[Supabase Verify Error]:', supabaseErr.message, '-> checking local OTP store.');
      }
    }

    const record = otpStore.get(email);

    if (!record) {
      return res.status(400).json({ error: 'No verification code found. Please request a new one.' });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
    }
    if (record.attempts >= 5) {
      otpStore.delete(email);
      return res.status(429).json({ error: 'Too many attempts. Please request a new code.' });
    }

    record.attempts += 1;

    if (record.otp !== otp) {
      const left = 5 - record.attempts;
      return res.status(401).json({ error: `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} remaining.` });
    }

    otpStore.delete(email); // consume OTP immediately
    return res.json({ success: true, email, message: 'Email verified successfully.' });
  });

  // ── SOS ESCALATION ENGINE ────────────────────────────────────────────────────

  // 1. TRIGGER SOS INCIDENT
  app.post('/api/sos/trigger', (req, res) => {
    try {
      const { userId, userName, userPhone, location, biometrics, isOffline } = req.body;
      
      const defaultLoc = location || {
        latitude: 22.5726,
        longitude: 88.3639,
        accuracyMeters: 5,
        addressLandmark: 'Central Metro Corridor, Exit Gate 3'
      };

      const defaultBio = biometrics || {
        heartRateBpm: 142,
        fallDetected: true,
        stressScore: 88,
        audioSnippetCaptured: true,
        cameraSnapshotCaptured: true,
        fiveMinTrail: [
          { lat: 22.5710, lng: 88.3620, timestamp: '5 mins ago' },
          { lat: 22.5720, lng: 88.3630, timestamp: '2 mins ago' },
          { lat: 22.5726, lng: 88.3639, timestamp: 'Just now' }
        ]
      };

      const incident = globalEscalationEngine.triggerSOS(
        userId || 'user-nari-01',
        userName || 'Priya Sharma',
        userPhone || '+91 98311 00000',
        defaultLoc,
        defaultBio,
        !!isOffline
      );

      res.status(201).json({
        success: true,
        message: 'Chain-of-Custody Escalation Engine initialized.',
        incident
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. ACKNOWLEDGE INCIDENT (HALTS ESCALATION)
  app.post('/api/sos/acknowledge', (req, res) => {
    try {
      const { incidentId, responderName, responderTier, channel } = req.body;
      const incident = globalEscalationEngine.acknowledgeSOS(
        incidentId,
        responderName || 'Ananya Dey (Primary Contact)',
        responderTier || 'TIER_1_PRIMARY',
        channel || 'TWILIO_SMS'
      );

      if (!incident) {
        return res.status(404).json({ error: 'Incident record not found.' });
      }

      res.json({
        success: true,
        message: 'Escalation chain halted. Response logged in chain-of-custody audit trail.',
        incident
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. DURESS VS SAFE DISARM PIN
  app.post('/api/sos/duress-disarm', (req, res) => {
    try {
      const { incidentId, pin } = req.body;
      const result = globalEscalationEngine.processDisarmPin(incidentId, pin);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. GUARDIAN RESPOND ("I CAN HELP")
  app.post('/api/sos/guardian-respond', (req, res) => {
    try {
      const { incidentId, guardianName } = req.body;
      const incident = globalEscalationEngine.guardianRespond(incidentId, guardianName || 'Local Guardian (Opt-In)');
      if (!incident) {
        return res.status(404).json({ error: 'Incident record not found.' });
      }
      res.json({ success: true, incident });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. GET AUDIT TRAIL
  app.get('/api/sos/incident/:id/audit-trail', (req, res) => {
    const incident = globalEscalationEngine.getIncident(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident record not found.' });
    }
    res.json({
      incidentId: incident.id,
      status: incident.status,
      currentTier: incident.currentTier,
      auditTrail: incident.auditTrail
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NARI Full-Stack Server running on http://localhost:${PORT}`);
    if (process.env.SMTP_USER) {
      console.log(`📧 Real Email Delivery: ACTIVE via Gmail SMTP (${process.env.SMTP_USER})`);
    } else if (supabase) {
      console.log(`🔐 Supabase Email OTP Auth: CONNECTED (${SUPABASE_URL})`);
    } else {
      console.log(`⚠ SMTP/Supabase Auth: Disabled (using test OTP fallback)`);
    }
  });
}

startServer();
