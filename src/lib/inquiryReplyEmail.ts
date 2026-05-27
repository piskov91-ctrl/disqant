import { sendFitRoomMail } from "@/lib/fitRoomEmail";
import {
  FIT_ROOM_THREAD_HEADER,
  fitRoomThreadHeaderValue,
  fitRoomThreadSubjectToken,
  type InquiryConversationKind,
} from "@/lib/inquiryConversationStore";
import {
  transactionalFormattedLetterBody,
  transactionalParagraph,
  wrapFitRoomTransactionalHtml,
} from "@/lib/fitRoomTransactionalEmailHtml";

const SUPPORT_INBOX = (process.env.CONTACT_TO ?? "support@fit-room.com").trim();

export function buildInquiryReplySubject(params: {
  kind: InquiryConversationKind;
  inquiryId: string;
  baseSubject: string;
}): string {
  const token = fitRoomThreadSubjectToken(params.kind, params.inquiryId);
  const base = params.baseSubject.trim();
  if (base.includes(token)) return base;
  return `${base} ${token}`.trim();
}

export function buildInquiryReplyMailContent(params: {
  greetingName: string;
  message: string;
  heading?: string;
}) {
  const first = params.greetingName.trim() || "there";
  const message = params.message.trim();
  const preheaderSlice = message.length > 100 ? `${message.slice(0, 97)}…` : message;
  const text = [`Hi ${first},`, "", message, "", "Warmly,", "The Fit Room team"].join("\n");
  const htmlInner =
    transactionalParagraph(`Hi ${first},`) +
    transactionalFormattedLetterBody(message) +
    transactionalParagraph("Warmly,") +
    transactionalParagraph("The Fit Room team");
  const html = wrapFitRoomTransactionalHtml({
    documentTitle: "Message from Fit Room",
    preheader: preheaderSlice,
    heading: params.heading ?? "A note from Fit Room support",
    innerHtml: htmlInner,
  });
  return { text, html, preheaderSlice };
}

export async function sendInquiryReplyEmail(params: {
  kind: InquiryConversationKind;
  inquiryId: string;
  to: string;
  subject: string;
  greetingName: string;
  message: string;
}) {
  const threadHeader = fitRoomThreadHeaderValue(params.kind, params.inquiryId);
  const subject = buildInquiryReplySubject({
    kind: params.kind,
    inquiryId: params.inquiryId,
    baseSubject: params.subject,
  });
  const { text, html } = buildInquiryReplyMailContent({
    greetingName: params.greetingName,
    message: params.message,
  });

  return sendFitRoomMail({
    to: params.to,
    subject,
    text,
    html,
    replyTo: SUPPORT_INBOX,
    headers: {
      [FIT_ROOM_THREAD_HEADER]: threadHeader,
    },
  });
}

export function staffNotificationThreadHeaders(params: {
  kind: InquiryConversationKind;
  inquiryId: string;
}): Record<string, string> {
  return {
    [FIT_ROOM_THREAD_HEADER]: fitRoomThreadHeaderValue(params.kind, params.inquiryId),
  };
}

export function staffNotificationSubjectWithToken(params: {
  kind: InquiryConversationKind;
  inquiryId: string;
  baseSubject: string;
}): string {
  return buildInquiryReplySubject(params);
}
