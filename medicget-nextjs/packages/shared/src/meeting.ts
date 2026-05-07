/**
 * Meeting link generator — wraps a public Jitsi Meet room URL.
 *
 * Why Jitsi:
 *   • Free, no API key, no account, works on any device with a browser
 *   • Rooms are created on-demand the first time someone visits the URL
 *   • Privacy is reasonable for MVP — anyone with the URL can join, and
 *     the URL is unguessable because we use the appointment's cuid (~25
 *     random chars) as the room slug.
 *
 * Future hardening options:
 *   • Self-host Jitsi or pay for Jitsi-as-a-Service to enforce JWT auth
 *     so only paid participants can enter the room
 *   • Switch to Daily.co / Twilio Video for SDK-driven rooms with moderator
 *     controls, recording, transcripts, etc.
 *
 * `JITSI_BASE_URL` env var lets you point at a self-hosted instance later
 * without code changes.
 */
import { getSetting } from './settings';

const DEFAULT_JITSI_BASE = 'https://meet.jit.si';

/**
 * Async — reads JITSI_BASE_URL from AppSettings (DB) with env-var fallback,
 * so the superadmin can swap to a self-hosted Jitsi (or 8x8.vc) without
 * a redeploy.
 */
export async function generateMeetingUrl(appointmentId: string): Promise<string> {
  const base = (await getSetting('JITSI_BASE_URL', DEFAULT_JITSI_BASE))!;
  // Prefix with `medicget-` so it's obvious in logs / browser history that
  // it's a MedicGet meeting room.
  return `${base.replace(/\/+$/, '')}/medicget-${appointmentId}`;
}
