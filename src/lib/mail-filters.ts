/**
 * Detect calendar RSVP / meeting-response notices so Inbox triage can skip them.
 * Keeps meeting invitations and other calendar mail that are not RSVP responses.
 */

/** Accepted: / Declined: / Tentative: / Tentatively Accepted: / Proposed new time: */
const SUBJECT_RSVP =
  /(?:^|[\s\[(])(?:accepted|declined|tentative(?:ly\s+accepted)?|proposed\s+new\s+time)\s*:/i;

/** Obvious Google Calendar RSVP phrasing in subject or snippet. */
const GOOGLE_RSVP_PHRASE =
  /\b(?:accepted|declined|tentatively\s+accepted)\s+your\s+invitation\b|\bproposed\s+a\s+new\s+time\b|\bresponded\s+(?:yes|no|maybe)\s+to\s+your\s+invitation\b/i;

const CALENDAR_NOTIFICATION_FROM = /calendar-notification@google\.com/i;

export function isMeetingResponseEmail(input: {
  subject: string;
  from?: string;
  snippet?: string;
}): boolean {
  const subject = (input.subject ?? "").trim();
  const from = (input.from ?? "").trim();
  const snippet = (input.snippet ?? "").trim();

  if (SUBJECT_RSVP.test(subject)) {
    return true;
  }

  if (GOOGLE_RSVP_PHRASE.test(subject) || GOOGLE_RSVP_PHRASE.test(snippet)) {
    return true;
  }

  // calendar-notification@google.com only when subject already looks like an RSVP
  if (CALENDAR_NOTIFICATION_FROM.test(from) && SUBJECT_RSVP.test(subject)) {
    return true;
  }

  return false;
}
